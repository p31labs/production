/**
 * api/bus/verify-chain — recompute and confirm the ledger's hash chain.
 */
import { verifyChain, type Env } from '../../_lib/ledger';

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const result = await verifyChain(env);
  return Response.json(result, { status: result.valid ? 200 : 503 });
};