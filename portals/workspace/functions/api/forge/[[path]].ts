import type { PagesFunction } from '@cloudflare/workers-types'

interface Env {
  FORGE_ORIGIN?: string
}

/**
 * Same-origin proxy to the P31 Forge.
 *
 *   GET  /api/forge/health   → <FORGE_ORIGIN>/health
 *   GET  /api/forge/brand    → <FORGE_ORIGIN>/brand
 *   POST /api/forge/stylize  → <FORGE_ORIGIN>/stylize
 *
 * The FORGE_ORIGIN defaults to the live forge worker.
 */
export const onRequest: PagesFunction<Env> = async ({ request, env, params }) => {
  const origin = env.FORGE_ORIGIN ?? 'https://p31-forge.trimtab-signal.workers.dev'
  const path = Array.isArray(params.path) ? params.path.join('/') : (params.path ?? '')
  const url = new URL(request.url)

  const target = `${origin}/${path}${url.search}`

  const headers = new Headers()
  const contentType = request.headers.get('content-type')
  if (contentType) headers.set('content-type', contentType)
  headers.set('accept', request.headers.get('accept') ?? '*/*')

  const init: RequestInit = {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
  }

  const upstream = await fetch(target, init)

  const responseHeaders = new Headers()
  const upstreamType = upstream.headers.get('content-type')
  if (upstreamType) responseHeaders.set('content-type', upstreamType)

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  })
}