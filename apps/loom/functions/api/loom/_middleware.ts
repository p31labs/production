import { accessGate, type AccessEnv } from './_lib/access';

/** Every /api/loom/* route sits behind the Cloudflare Access gate. */
export const onRequest: PagesFunction<AccessEnv> = accessGate;