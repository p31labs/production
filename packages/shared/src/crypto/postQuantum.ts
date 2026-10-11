/**
 * DEPRECATED / REMOVED — do not implement crypto here.
 *
 * This file previously carried a copy of a P-256/PQC hybrid KEM that was
 * mislabeled as "X25519+ML-KEM-768" and could not round-trip (the encrypt path
 * never transmitted its ephemeral public key). It was not exported by
 * packages/shared and had no importers.
 *
 * The canonical, KAT-validated implementation now lives in
 * `@p31ca/sovereign-primitives` (see its `postQuantum.ts`, which uses the
 * spec X-Wing preset `ml_kem768_x25519`). Import from there instead.
 */

export {};
