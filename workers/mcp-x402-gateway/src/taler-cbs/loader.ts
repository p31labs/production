// taler-cbs/loader.ts — TWO-CHALLENGE Clause Blind Schnorr WASM loader
// (mcp-x402-gateway Worker, CLIENT side).
//
// Cloudflare Workers (workerd) BLOCKS runtime WASM code-gen from raw bytes.
// The supported path is a pre-compiled module: wrangler's [[rules]] type =
// "CompiledWasm" compiles ./taler_cs.wasm at deploy time into a
// WebAssembly.Module, imported here and instantiated once (instantiating a
// pre-compiled module is allowed; compiling from raw bytes is not).
//
// The gateway is the CLIENT: it blinds the settlement message, asks the
// ledger to sign both blinded challenges, unblinds, and (defensively)
// self-verifies before forwarding. Scheme per docs/specs/love-settlement-cbs.md.

import wasmModule from './taler_cs.wasm';

const P = 32;

let instance: WebAssembly.Instance | null = null;
let initialized = false;

let MEM!: WebAssembly.Memory;
let csBlind!: (
  m: number, ml: number,
  a0: number, a1: number, b0: number, b1: number,
  r0: number, r1: number, x: number,
  rp0: number, rp1: number, c0: number, c1: number, cp0: number, cp1: number,
) => number;
let csUnblind!: (s0: number, s1: number, a0: number, a1: number, sp0: number, sp1: number) => number;
let csVerify!: (
  m: number, ml: number,
  cp0: number, sp0: number, cp1: number, sp1: number,
  x: number, rp0: number, rp1: number,
) => number;

let BASE = 0;

export async function ensureCbs(): Promise<void> {
  if (initialized) return;
  // With ESM .wasm imports the bound value may arrive as the Module
  // directly, as a namespace with a `.default` Module, or as a
  // pre-instantiated Instance. Handle all three shapes defensively.
  const input: any = (wasmModule as any)?.default ?? wasmModule;
  let inst: WebAssembly.Instance;
  if (input instanceof WebAssembly.Instance) {
    inst = input;
  } else {
    inst = await WebAssembly.instantiate(input as WebAssembly.Module);
  }
  instance = inst;
  const ex = instance.exports as Record<string, any>;
  MEM = ex.memory as WebAssembly.Memory;
  const heapBase = (ex.__heap_base as WebAssembly.Global).value as number;
  BASE = Math.ceil(heapBase / 1024) * 1024;
  csBlind = ex.cs_blind;
  csUnblind = ex.cs_unblind;
  csVerify = ex.cs_verify;
  initialized = true;
}

function ensure(off: number, n: number) {
  while (MEM.buffer.byteLength < off + n) MEM.grow(1);
}
function wr(off: number, d: Uint8Array) {
  ensure(off, d.length);
  new Uint8Array(MEM.buffer, off, d.length).set(d);
}
function rd(off: number, n: number): Uint8Array {
  ensure(off, n);
  return new Uint8Array(MEM.buffer, off, n).slice();
}

const OFF_A0 = () => BASE + 0;
const OFF_A1 = () => BASE + P;
const OFF_B0 = () => BASE + 2 * P;
const OFF_B1 = () => BASE + 3 * P;
const OFF_R0 = () => BASE + 4 * P;
const OFF_R1 = () => BASE + 5 * P;
const OFF_X = () => BASE + 6 * P;
const OFF_RP0 = () => BASE + 7 * P;
const OFF_RP1 = () => BASE + 8 * P;
const OFF_C0 = () => BASE + 9 * P;
const OFF_C1 = () => BASE + 10 * P;
const OFF_CP0 = () => BASE + 11 * P;
const OFF_CP1 = () => BASE + 12 * P;
const OFF_S0 = () => BASE + 13 * P;
const OFF_S1 = () => BASE + 14 * P;
const OFF_BUF = () => BASE + 16 * P;

export interface BlindResult {
  rp0: Uint8Array; // R'_0 — blinded nonce point (final signature)
  rp1: Uint8Array; // R'_1
  c0: Uint8Array;  // c_0  — blinded challenge (to issuer)
  c1: Uint8Array;  // c_1
  cp0: Uint8Array; // c'_0 — unblinded challenge (kept)
  cp1: Uint8Array; // c'_1
}

export function blind(
  msg: Uint8Array,
  a0: Uint8Array, a1: Uint8Array,
  b0: Uint8Array, b1: Uint8Array,
  R0: Uint8Array, R1: Uint8Array,
  X: Uint8Array,
): BlindResult {
  const m = OFF_BUF() + P;
  wr(m, msg);
  wr(OFF_A0(), a0); wr(OFF_A1(), a1);
  wr(OFF_B0(), b0); wr(OFF_B1(), b1);
  wr(OFF_R0(), R0); wr(OFF_R1(), R1);
  wr(OFF_X(), X);
  const ok = csBlind(m, msg.length, OFF_A0(), OFF_A1(), OFF_B0(), OFF_B1(), OFF_R0(), OFF_R1(), OFF_X(),
    OFF_RP0(), OFF_RP1(), OFF_C0(), OFF_C1(), OFF_CP0(), OFF_CP1());
  if (ok !== 0) throw new Error('cs_blind failed');
  return {
    rp0: rd(OFF_RP0(), P), rp1: rd(OFF_RP1(), P),
    c0: rd(OFF_C0(), P), c1: rd(OFF_C1(), P),
    cp0: rd(OFF_CP0(), P), cp1: rd(OFF_CP1(), P),
  };
}

export function unblind(
  s0: Uint8Array, s1: Uint8Array,
  a0: Uint8Array, a1: Uint8Array,
): { sp0: Uint8Array; sp1: Uint8Array } {
  wr(OFF_A0(), s0); wr(OFF_A1(), s1);
  wr(OFF_B0(), a0); wr(OFF_B1(), a1);
  const ok = csUnblind(OFF_A0(), OFF_A1(), OFF_B0(), OFF_B1(), OFF_S0(), OFF_S1());
  if (ok !== 0) throw new Error('cs_unblind failed');
  return { sp0: rd(OFF_S0(), P), sp1: rd(OFF_S1(), P) };
}

export function verify(
  msg: Uint8Array,
  cp0: Uint8Array, sp0: Uint8Array,
  cp1: Uint8Array, sp1: Uint8Array,
  X: Uint8Array,
  rp0: Uint8Array, rp1: Uint8Array,
): boolean {
  const m = OFF_BUF() + P;
  wr(m, msg);
  wr(OFF_A0(), cp0); wr(OFF_A1(), sp0);
  wr(OFF_B0(), cp1); wr(OFF_B1(), sp1);
  wr(OFF_X(), X);
  wr(OFF_R0(), rp0); wr(OFF_R1(), rp1);
  return csVerify(m, msg.length, OFF_A0(), OFF_A1(), OFF_B0(), OFF_B1(), OFF_X(), OFF_R0(), OFF_R1()) === 0;
}