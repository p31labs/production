import { describe, it, expect } from "vitest";
import {
  generateKEMKeyPair,
  hybridEncrypt,
  hybridDecrypt,
  assessPQCReadiness,
} from "./postQuantum";

const XWING_PK_LEN = 1216;
const XWING_SK_LEN = 32;
const XWING_CT_LEN = 1120;

describe("X-Wing hybrid KEM (canonical post-quantum)", () => {
  it("generates correctly-sized X-Wing keys", async () => {
    const kp = await generateKEMKeyPair();
    expect(kp.publicKey.length).toBe(XWING_PK_LEN);
    expect(kp.secretKey.length).toBe(XWING_SK_LEN);
    expect(kp.algorithm).toBe("X25519+ML-KEM-768 (X-Wing)");
  });

  it("encrypt/decrypt round-trips", async () => {
    const kp = await generateKEMKeyPair();
    const message = new TextEncoder().encode("p31 love ledger payload");
    const enc = await hybridEncrypt(message, kp.publicKey);
    expect(enc.kemCiphertext.length).toBe(XWING_CT_LEN);
    expect(enc.algorithm).toBe("AES-256-GCM+X-Wing");

    const dec = await hybridDecrypt(enc, kp.secretKey);
    expect(new TextDecoder().decode(dec)).toBe("p31 love ledger payload");
  });

  it("fails to decrypt under a different recipient key (AEAD rejects)", async () => {
    const kp = await generateKEMKeyPair();
    const other = await generateKEMKeyPair();
    const enc = await hybridEncrypt(new TextEncoder().encode("secret"), kp.publicKey);
    await expect(hybridDecrypt(enc, other.secretKey)).rejects.toThrow();
  });

  it("readiness reports X-Wing available", async () => {
    const r = await assessPQCReadiness();
    expect(r.xwingAvailable).toBe(true);
    expect(r.algorithms.some((a) => a.includes("X-Wing"))).toBe(true);
  });
});
