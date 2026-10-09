/**
 * api/bus/emit — POST an event into the durable ledger. Returns the stored row.
 */
import { append, type Env } from '../../_lib/ledger';
import type { BusEvent } from '../../../src/bus/events';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let ev: BusEvent;
  try {
    ev = (await request.json()) as BusEvent;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!ev || typeof ev.type !== 'string') {
    return Response.json({ error: 'event type required' }, { status: 400 });
  }
  try {
    const row = await append(env, ev, {});
    return Response.json({ ok: true, event: row });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'ledger failure' }, { status: 500 });
  }
};