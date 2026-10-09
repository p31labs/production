import { readRefusals, type LoomPagesEnv } from '../_lib/log';

/** GET /api/loom/refusals — the governance sidecar log. Hash-chained with the
 *  same JCS canonicalizer as the events log (each row's prev_hash → the
 *  previous row); joinable to the main log by ts. `mode` separates enforced
 *  refusals from observations (observe mode: "would have been refused").
 *  Tamper-evidence lives at /api/loom/refusals/verify. */
export const onRequestGet: PagesFunction<LoomPagesEnv> = async (context) => {
  const refusals = await readRefusals(context.env);
  const counts = {
    enforce: refusals.filter((r) => r.mode === 'enforce').length,
    observe: refusals.filter((r) => r.mode === 'observe').length,
  };
  return Response.json({ refusals, count: refusals.length, counts });
};