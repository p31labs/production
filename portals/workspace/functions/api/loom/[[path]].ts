import type { PagesFunction } from '@cloudflare/workers-types'

interface Env {
  LOOM_ORIGIN?: string
}

/**
 * Same-origin proxy to the P31 Loom chain.
 *
 * HONEST STATE: the Loom write path (POST /api/loom/event) is identity-gated
 * behind Cloudflare Access. A browser session carries the Access JWT; a
 * server-side proxy cannot impersonate a family member. This proxy forwards
 * the Cf-Access-Jwt-Assertion header when present, and returns 401 when it is
 * absent — it does NOT claim to journal on the family member's behalf.
 *
 * See VERIFIED_FACTS §12.6 for the interim gate posture.
 */
export const onRequest: PagesFunction<Env> = async ({ request, env, params }) => {
  const origin = env.LOOM_ORIGIN ?? 'https://loom.p31ca.org'
  const path = Array.isArray(params.path) ? params.path.join('/') : (params.path ?? '')
  const url = new URL(request.url)

  const jwt = request.headers.get('Cf-Access-Jwt-Assertion')
  if (!jwt) {
    return new Response(
      JSON.stringify({
        error: 'unauthorized',
        detail:
          'Loom writes require a Cloudflare Access identity. A server-side proxy ' +
          'cannot impersonate a family member. The chain journal is pending; ' +
          'approval is recorded locally.',
      }),
      { status: 401, headers: { 'content-type': 'application/json' } },
    )
  }

  const target = `${origin}/${path}${url.search}`
  const headers = new Headers()
  headers.set('Cf-Access-Jwt-Assertion', jwt)
  const contentType = request.headers.get('content-type')
  if (contentType) headers.set('content-type', contentType)

  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
  })

  return new Response(upstream.body, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  })
}