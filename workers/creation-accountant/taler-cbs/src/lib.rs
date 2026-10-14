//! taler-cbs — TWO-CHALLENGE Clause Blind Schnorr (CBS) over Ed25519.
//!
//! Real, audited primitives only (curve25519-dalek + sha2). No hand-rolled
//! curve math. The single-challenge blind-Schnorr variant is vulnerable to
//! the (modified) ROS attack; this crate implements the two-challenge
//! Clause Blind Schnorr construction from the GNU Taler CS thesis
//! ("Adding Schnorr's blind signature in Taler", Demarmels/Heuzeveldt),
//! §2.2.4/§3.2: the issuer publishes TWO per-withdrawal ephemeral nonces
//! R_0, R_1 (each bound to the denomination key and a single-use nonce `t`),
//! the client blinds BOTH challenges, the issuer returns TWO partial
//! signatures, and verification checks BOTH equations:
//!
//!     s'_i·G = R'_i + c'_i·X   with   c'_i = H(R'_i ‖ m) mod q,  i ∈ {0,1}
//!
//! Protocol (additive blinding, per thesis fig. 3.1/3.2, extended to sign
//! BOTH challenges — signing only one, as in the original thesis figure,
//! would leave the single-challenge ROS surface open):
//!   issuer:  R_i = n_i·G            (n_i derived from x and one-time t)
//!   blind:   R'_i = R_i + α_i·G + β_i·X
//!            c'_i = H(R'_i ‖ m) mod q      (kept by client)
//!            c_i  = c'_i + β_i mod q       (sent to issuer)
//!   sign:    s_i  = n_i + c_i·x            (issuer, BOTH i)
//!   unblind: s'_i = s_i + α_i mod q
//!   verify:  s'_i·G == R'_i + c'_i·X  AND  c'_i == H(R'_i ‖ m)  (BOTH i)
//!
//! ABI: `blind`, `sign_blinded`, `unblind`, `verify`, `base` — the same
//! exported names as the single-challenge release, extended for the
//! two-challenge scheme (each now carries two challenges/partials).
//!
//! SECURITY: the nonce pair (n_0, n_1) is derived deterministically from
//! (x, t) by the host (taler-cbs/kdf.ts); reusing the same `t` across two
//! blind-sign calls would sign two different challenge pairs under the same
//! nonces, from which x leaks (s_1 − s_2 = (c_1 − c_2)·x). The ledger
//! enforces single-use `t` at /blind-sign (D1 cbs_nonce INSERT as gate).

use core::ptr;
use curve25519_dalek::edwards::CompressedEdwardsY;
use curve25519_dalek::{EdwardsPoint, Scalar};
use sha2::{Digest, Sha512};

const P: usize = 32;

#[inline]
fn decompress(p: &[u8; 32]) -> Option<EdwardsPoint> {
    CompressedEdwardsY::from_slice(p).ok()?.decompress()
}

/// H(data) mod q → Scalar (proper mod-q reduction of the 64-byte hash).
fn hash_mod_q(data: &[u8]) -> Scalar {
    let mut h = Sha512::new();
    h.update(data);
    let d = h.finalize();
    let mut b = [0u8; 32];
    b.copy_from_slice(&d[0..32]);
    Scalar::from_bytes_mod_order(b)
}

/// Client blinds message `m` with scalars (α_0, α_1, β_0, β_1) against the
/// issuer's TWO ephemeral nonce points (R_0, R_1) and public key X.
/// Returns the blinded challenges (c_0, c_1) to send to the issuer, the
/// challenges the client keeps (c'_0, c'_1), and the blinded nonce points
/// (R'_0, R'_1) that form the final signature.
#[allow(clippy::too_many_arguments)]
pub fn blind(
    msg: &[u8],
    a0: &[u8; 32],
    a1: &[u8; 32],
    b0: &[u8; 32],
    b1: &[u8; 32],
    r0: &[u8; 32],
    r1: &[u8; 32],
    x: &[u8; 32],
) -> Option<([u8; 32], [u8; 32], [u8; 32], [u8; 32], [u8; 32], [u8; 32])> {
    if msg.is_empty() || msg.len() > 1024 {
        return None;
    }
    let a0 = Scalar::from_bytes_mod_order(*a0);
    let a1 = Scalar::from_bytes_mod_order(*a1);
    let b0 = Scalar::from_bytes_mod_order(*b0);
    let b1 = Scalar::from_bytes_mod_order(*b1);
    let r0 = decompress(r0)?;
    let r1 = decompress(r1)?;
    let x = decompress(x)?;

    // R'_i = R_i + α_i·G + β_i·X
    let rp0 = r0 + EdwardsPoint::mul_base(&a0) + x * b0;
    let rp1 = r1 + EdwardsPoint::mul_base(&a1) + x * b1;

    let rp0_c = rp0.compress().to_bytes();
    let rp1_c = rp1.compress().to_bytes();

    let mut buf = [0u8; P + 1024];
    buf[..P].copy_from_slice(&rp0_c);
    buf[P..P + msg.len()].copy_from_slice(msg);
    let cp0 = hash_mod_q(&buf[..P + msg.len()]);
    buf[..P].copy_from_slice(&rp1_c);
    buf[P..P + msg.len()].copy_from_slice(msg);
    let cp1 = hash_mod_q(&buf[..P + msg.len()]);

    // c_i = c'_i + β_i (blinded challenge, sent to the issuer)
    let c0 = cp0 + b0;
    let c1 = cp1 + b1;

    Some((
        rp0_c,
        rp1_c,
        c0.to_bytes(),
        c1.to_bytes(),
        cp0.to_bytes(),
        cp1.to_bytes(),
    ))
}

/// Issuer signs the TWO blinded challenges (c_0, c_1) with the per-withdrawal
/// nonces (n_0, n_1) and the private key x: s_i = n_i + c_i·x.
pub fn sign_blinded(
    c0: &[u8; 32],
    c1: &[u8; 32],
    n0: &[u8; 32],
    n1: &[u8; 32],
    x: &[u8; 32],
) -> ([u8; 32], [u8; 32]) {
    let c0 = Scalar::from_bytes_mod_order(*c0);
    let c1 = Scalar::from_bytes_mod_order(*c1);
    let n0 = Scalar::from_bytes_mod_order(*n0);
    let n1 = Scalar::from_bytes_mod_order(*n1);
    let x = Scalar::from_bytes_mod_order(*x);
    (
        (n0 + c0 * x).to_bytes(),
        (n1 + c1 * x).to_bytes(),
    )
}

/// Client unblinds the issuer's two partial signatures: s'_i = s_i + α_i.
pub fn unblind(
    s0: &[u8; 32],
    s1: &[u8; 32],
    a0: &[u8; 32],
    a1: &[u8; 32],
) -> ([u8; 32], [u8; 32]) {
    let s0 = Scalar::from_bytes_mod_order(*s0);
    let s1 = Scalar::from_bytes_mod_order(*s1);
    let a0 = Scalar::from_bytes_mod_order(*a0);
    let a1 = Scalar::from_bytes_mod_order(*a1);
    ((s0 + a0).to_bytes(), (s1 + a1).to_bytes())
}

/// Public point X = x·G (or R = n·G). Used by the issuer to publish
/// X/R_i and by the verifier. `x`/`n` are 32-byte scalars.
pub fn base(x: &[u8; 32]) -> Option<[u8; 32]> {
    let x = Scalar::from_bytes_mod_order(*x);
    Some(EdwardsPoint::mul_base(&x).compress().to_bytes())
}

/// Verifier: valid ⟺ for BOTH i ∈ {0,1}:
///   s'_i·G == R'_i + c'_i·X  AND  c'_i == H(R'_i ‖ m) mod q
/// (with R'_0/R'_1 supplied in the signature).
#[allow(clippy::too_many_arguments)]
pub fn verify(
    msg: &[u8],
    cp0: &[u8; 32],
    sp0: &[u8; 32],
    cp1: &[u8; 32],
    sp1: &[u8; 32],
    x: &[u8; 32],
    rp0: &[u8; 32],
    rp1: &[u8; 32],
) -> bool {
    if msg.is_empty() || msg.len() > 1024 {
        return false;
    }
    let cp0 = Scalar::from_bytes_mod_order(*cp0);
    let sp0 = Scalar::from_bytes_mod_order(*sp0);
    let cp1 = Scalar::from_bytes_mod_order(*cp1);
    let sp1 = Scalar::from_bytes_mod_order(*sp1);
    let x = match decompress(x) {
        Some(p) => p,
        None => return false,
    };
    let rp0 = match decompress(rp0) {
        Some(p) => p,
        None => return false,
    };
    let rp1 = match decompress(rp1) {
        Some(p) => p,
        None => return false,
    };

    // Challenge 0
    let lhs0 = EdwardsPoint::mul_base(&sp0) - x * cp0;
    if lhs0.compress().to_bytes() != rp0.compress().to_bytes() {
        return false;
    }
    let mut buf = [0u8; P + 1024];
    buf[..P].copy_from_slice(&rp0.compress().to_bytes());
    buf[P..P + msg.len()].copy_from_slice(msg);
    if hash_mod_q(&buf[..P + msg.len()]) != cp0 {
        return false;
    }

    // Challenge 1
    let lhs1 = EdwardsPoint::mul_base(&sp1) - x * cp1;
    if lhs1.compress().to_bytes() != rp1.compress().to_bytes() {
        return false;
    }
    buf[..P].copy_from_slice(&rp1.compress().to_bytes());
    buf[P..P + msg.len()].copy_from_slice(msg);
    hash_mod_q(&buf[..P + msg.len()]) == cp1
}

// ---------------------------------------------------------------------------
// wasm32 FFI — raw-pointer ABI, wraps the safe functions above.
// ---------------------------------------------------------------------------

#[inline]
unsafe fn rd32(p: *const u8) -> [u8; 32] {
    let mut b = [0u8; 32];
    ptr::copy_nonoverlapping(p, b.as_mut_ptr(), P);
    b
}

#[inline]
unsafe fn wr(p: *mut u8, b: &[u8]) {
    ptr::copy_nonoverlapping(b.as_ptr(), p, b.len());
}

/// Outputs: R'_0, R'_1 (the blinded nonce points in the final signature),
/// c_0, c_1 (blinded challenges → issuer), c'_0, c'_1 (kept by client).
#[no_mangle]
#[allow(clippy::too_many_arguments)]
pub unsafe extern "C" fn cs_blind(
    msg: *const u8,
    msg_len: usize,
    a0_ptr: *const u8,
    a1_ptr: *const u8,
    b0_ptr: *const u8,
    b1_ptr: *const u8,
    r0_ptr: *const u8,
    r1_ptr: *const u8,
    x_ptr: *const u8,
    rp0_out: *mut u8,
    rp1_out: *mut u8,
    c0_out: *mut u8,
    c1_out: *mut u8,
    cp0_out: *mut u8,
    cp1_out: *mut u8,
) -> i32 {
    let msg = core::slice::from_raw_parts(msg, msg_len);
    let a0 = rd32(a0_ptr);
    let a1 = rd32(a1_ptr);
    let b0 = rd32(b0_ptr);
    let b1 = rd32(b1_ptr);
    let r0 = rd32(r0_ptr);
    let r1 = rd32(r1_ptr);
    let x = rd32(x_ptr);
    match blind(msg, &a0, &a1, &b0, &b1, &r0, &r1, &x) {
        Some((rp0, rp1, c0, c1, cp0, cp1)) => {
            wr(rp0_out, &rp0);
            wr(rp1_out, &rp1);
            wr(c0_out, &c0);
            wr(c1_out, &c1);
            wr(cp0_out, &cp0);
            wr(cp1_out, &cp1);
            0
        }
        None => -1,
    }
}

#[no_mangle]
pub unsafe extern "C" fn cs_sign_blinded(
    c0_ptr: *const u8,
    c1_ptr: *const u8,
    n0_ptr: *const u8,
    n1_ptr: *const u8,
    x_ptr: *const u8,
    s0_out: *mut u8,
    s1_out: *mut u8,
) -> i32 {
    let c0 = rd32(c0_ptr);
    let c1 = rd32(c1_ptr);
    let n0 = rd32(n0_ptr);
    let n1 = rd32(n1_ptr);
    let x = rd32(x_ptr);
    let (s0, s1) = sign_blinded(&c0, &c1, &n0, &n1, &x);
    wr(s0_out, &s0);
    wr(s1_out, &s1);
    0
}

#[no_mangle]
pub unsafe extern "C" fn cs_unblind(
    s0_ptr: *const u8,
    s1_ptr: *const u8,
    a0_ptr: *const u8,
    a1_ptr: *const u8,
    sp0_out: *mut u8,
    sp1_out: *mut u8,
) -> i32 {
    let s0 = rd32(s0_ptr);
    let s1 = rd32(s1_ptr);
    let a0 = rd32(a0_ptr);
    let a1 = rd32(a1_ptr);
    let (sp0, sp1) = unblind(&s0, &s1, &a0, &a1);
    wr(sp0_out, &sp0);
    wr(sp1_out, &sp1);
    0
}

#[no_mangle]
#[allow(clippy::too_many_arguments)]
pub unsafe extern "C" fn cs_verify(
    msg: *const u8,
    msg_len: usize,
    cp0_ptr: *const u8,
    sp0_ptr: *const u8,
    cp1_ptr: *const u8,
    sp1_ptr: *const u8,
    x_ptr: *const u8,
    rp0_ptr: *const u8,
    rp1_ptr: *const u8,
) -> i32 {
    let msg = core::slice::from_raw_parts(msg, msg_len);
    let cp0 = rd32(cp0_ptr);
    let sp0 = rd32(sp0_ptr);
    let cp1 = rd32(cp1_ptr);
    let sp1 = rd32(sp1_ptr);
    let x = rd32(x_ptr);
    let rp0 = rd32(rp0_ptr);
    let rp1 = rd32(rp1_ptr);
    if verify(msg, &cp0, &sp0, &cp1, &sp1, &x, &rp0, &rp1) {
        0
    } else {
        -1
    }
}

#[no_mangle]
pub unsafe extern "C" fn cs_base(x_ptr: *const u8, out: *mut u8) -> i32 {
    let x = rd32(x_ptr);
    match base(&x) {
        Some(p) => {
            wr(out, &p);
            0
        }
        None => -1,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sha2::Digest;

    #[test]
    fn rfc8032_base_point() {
        let g = EdwardsPoint::mul_base(&Scalar::ONE).compress().to_bytes();
        let g_exp = [
            0x58, 0x66, 0x66, 0x66, 0x66, 0x66, 0x66, 0x66, 0x66, 0x66, 0x66, 0x66, 0x66, 0x66,
            0x66, 0x66, 0x66, 0x66, 0x66, 0x66, 0x66, 0x66, 0x66, 0x66, 0x66, 0x66, 0x66, 0x66,
            0x66, 0x66, 0x66, 0x66,
        ];
        assert_eq!(g.to_vec(), g_exp.to_vec(), "mul_base(1) must equal RFC base G");
    }

    fn rnd() -> [u8; 32] {
        let mut b = [0u8; 32];
        // deterministic-ish RNG via std (test only)
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        let mut h = DefaultHasher::new();
        static mut SEED: u64 = 0x9e3779b97f4a7c15;
        unsafe {
            SEED = SEED.wrapping_mul(6364136223846793005).wrapping_add(1);
            SEED.hash(&mut h);
        }
        let v = h.finish();
        b[0..8].copy_from_slice(&v.to_le_bytes());
        b
    }

    fn setup() -> (
        [u8; 32], // x
        [u8; 32], // X
        [u8; 32], // n0
        [u8; 32], // n1
        [u8; 32], // R0
        [u8; 32], // R1
    ) {
        let x = rnd();
        let x_pt = EdwardsPoint::mul_base(&Scalar::from_bytes_mod_order(x)).compress().to_bytes();
        let n0 = rnd();
        let n1 = rnd();
        let r0 = EdwardsPoint::mul_base(&Scalar::from_bytes_mod_order(n0)).compress().to_bytes();
        let r1 = EdwardsPoint::mul_base(&Scalar::from_bytes_mod_order(n1)).compress().to_bytes();
        (x, x_pt, n0, n1, r0, r1)
    }

    #[test]
    fn two_challenge_round_trip_and_tamper() {
        let (x, x_pt, n0, n1, r0, r1) = setup();
        let a0 = rnd();
        let a1 = rnd();
        let b0 = rnd();
        let b1 = rnd();
        let m = b"authorize 5 LOVE -> creator p31";

        let (rp0, rp1, c0, c1, cp0, cp1) =
            blind(m, &a0, &a1, &b0, &b1, &r0, &r1, &x_pt).unwrap();

        let (s0, s1) = sign_blinded(&c0, &c1, &n0, &n1, &x);
        let (sp0, sp1) = unblind(&s0, &s1, &a0, &a1);

        assert!(
            verify(m, &cp0, &sp0, &cp1, &sp1, &x_pt, &rp0, &rp1),
            "valid two-challenge CBS signature must verify"
        );

        // Tampered s'_0 must fail.
        let mut bad = sp0;
        bad[0] ^= 0xff;
        assert!(
            !verify(m, &cp0, &bad, &cp1, &sp1, &x_pt, &rp0, &rp1),
            "tampered s'_0 must be rejected"
        );

        // Tampered s'_1 must fail.
        let mut bad1 = sp1;
        bad1[0] ^= 0xff;
        assert!(
            !verify(m, &cp0, &sp0, &cp1, &bad1, &x_pt, &rp0, &rp1),
            "tampered s'_1 must be rejected"
        );

        // Wrong message must fail.
        let wrong = b"authorize 5000 LOVE -> attacker";
        assert!(
            !verify(wrong, &cp0, &sp0, &cp1, &sp1, &x_pt, &rp0, &rp1),
            "wrong-message signature must be rejected"
        );
    }

    #[test]
    fn wrong_denomination_key_fails() {
        let (x, x_pt, n0, n1, r0, r1) = setup();
        let a0 = rnd();
        let a1 = rnd();
        let b0 = rnd();
        let b1 = rnd();
        let m = b"authorize 5 LOVE -> creator p31";
        let (rp0, rp1, c0, c1, cp0, cp1) =
            blind(m, &a0, &a1, &b0, &b1, &r0, &r1, &x_pt).unwrap();
        let (s0, s1) = sign_blinded(&c0, &c1, &n0, &n1, &x);
        let (sp0, sp1) = unblind(&s0, &s1, &a0, &a1);

        // Verify against a DIFFERENT denom key X' = x'·G.
        let x2 = rnd();
        let x2_pt = EdwardsPoint::mul_base(&Scalar::from_bytes_mod_order(x2)).compress().to_bytes();
        assert!(
            !verify(m, &cp0, &sp0, &cp1, &sp1, &x2_pt, &rp0, &rp1),
            "signature under the wrong denomination key must be rejected"
        );
    }

    #[test]
    fn one_challenge_forgery_fails() {
        // An attacker limited to ONE valid challenge pair (the
        // single-challenge blind-Schnorr surface) must not satisfy the
        // two-challenge verifier unless both slots carry the SAME valid
        // pair (which attests nothing new). Mixing a valid challenge-0
        // pair with an arbitrary or foreign-message challenge-1 slot must
        // be rejected.
        let (x, x_pt, n0, n1, r0, r1) = setup();
        let a0 = rnd();
        let a1 = rnd();
        let b0 = rnd();
        let b1 = rnd();
        let m = b"authorize 5 LOVE -> creator p31";
        let (rp0, rp1, c0, c1, cp0, cp1) =
            blind(m, &a0, &a1, &b0, &b1, &r0, &r1, &x_pt).unwrap();
        let (s0, s1) = sign_blinded(&c0, &c1, &n0, &n1, &x);
        let (sp0, sp1) = unblind(&s0, &s1, &a0, &a1);

        // A second signature over a DIFFERENT message, valid on its own,
        // must not combine with challenge 0 (cross-message forgery).
        let m2 = b"authorize 9999 LOVE -> attacker";
        let (rp0_b, rp1_b, c0_b, c1_b, cp0_b, cp1_b) =
            blind(m2, &a0, &a1, &b0, &b1, &r0, &r1, &x_pt).unwrap();
        let (s0_b, s1_b) = sign_blinded(&c0_b, &c1_b, &n0, &n1, &x);
        let (sp0_b, sp1_b) = unblind(&s0_b, &s1_b, &a0, &a1);
        assert!(
            !verify(m, &cp0, &sp0, &cp1_b, &sp1_b, &x_pt, &rp0, &rp1_b),
            "cross-message slot mix must be rejected"
        );

        // Random challenge-1 values alongside a valid challenge 0.
        assert!(
            !verify(m, &cp0, &sp0, &rnd(), &rnd(), &x_pt, &rp0, &rnd()),
            "random challenge-1 fill must be rejected"
        );

        // Sanity: the real two-challenge signature still verifies.
        assert!(
            verify(m, &cp0, &sp0, &cp1, &sp1, &x_pt, &rp0, &rp1),
            "genuine signature must verify after forgery attempts"
        );
    }

    #[test]
    fn nonce_reuse_leaks_x() {
        // SECURITY PROOF: signing two DIFFERENT challenge pairs under the
        // SAME nonces (n_0, n_1) leaks x: s_1 − s_2 = (c_1 − c_2)·x.
        // This is exactly why each per-withdrawal `t` (hence each nonce
        // pair) must be single-use, enforced by the ledger at /blind-sign.
        let (x, x_pt, n0, n1, r0, r1) = setup();
        let x_sc = Scalar::from_bytes_mod_order(x);

        let (c0a, c1a, c0b, c1b) = (rnd(), rnd(), rnd(), rnd());
        let (s0a, s1a) = sign_blinded(&c0a, &c1a, &n0, &n1, &x);
        let (s0b, s1b) = sign_blinded(&c0b, &c1b, &n0, &n1, &x);

        // Recover x from challenge 0's pair of signatures.
        let s0a_s = Scalar::from_bytes_mod_order(s0a);
        let s0b_s = Scalar::from_bytes_mod_order(s0b);
        let c0a_s = Scalar::from_bytes_mod_order(c0a);
        let c0b_s = Scalar::from_bytes_mod_order(c0b);
        let delta_s = s0a_s - s0b_s;
        let delta_c = c0a_s - c0b_s;
        let recovered = delta_s * delta_c.invert();
        assert_eq!(
            recovered.to_bytes().to_vec(),
            x_sc.to_bytes().to_vec(),
            "nonce reuse must leak the issuer secret x (proves single-use t is REQUIRED)"
        );
        let _ = (x_pt, r0, r1, c1a, c1b, s1a, s1b, c0b, s0b_s);
    }
}