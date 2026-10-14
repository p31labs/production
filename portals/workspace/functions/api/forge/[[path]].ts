import type { PagesFunction } from '@cloudflare/workers-types'

interface Env {
  FORGE_ORIGIN?: string
  FORGE_RENDER_ORIGIN?: string
  CF_ACCESS_CLIENT_ID?: string
  CF_ACCESS_CLIENT_SECRET?: string
}

/**
 * Same-origin proxy to the P31 Forge.
 *
 *   GET  /api/forge/health    → <FORGE_ORIGIN>/health
 *   GET  /api/forge/brand     → <FORGE_ORIGIN>/brand
 *   POST /api/forge/stylize   → <FORGE_ORIGIN>/stylize          (legacy)
 *   POST /api/forge/render    → <FORGE_RENDER_ORIGIN>/render    (IR → PDF)
 *   POST /api/forge/render/docx → <FORGE_RENDER_ORIGIN>/render/docx (IR → DOCX)
 *   POST /api/forge/render/html → <FORGE_RENDER_ORIGIN>/render/html (debug)
 *
 * FORGE_RENDER_ORIGIN defaults to the live render worker
 * (p31-forge-render.<subdomain>.workers.dev).
 */
export const onRequest: PagesFunction<Env> = async ({ request, env, params }) => {
  const path = Array.isArray(params.path) ? params.path.join('/') : (params.path ?? '')
  const origin = path.startsWith('render')
    ? env.FORGE_RENDER_ORIGIN ?? 'https://p31-forge-render.trimtab-signal.workers.dev'
    : env.FORGE_ORIGIN ?? 'https://p31-forge.trimtab-signal.workers.dev'
  const url = new URL(request.url)

  const target = `${origin}/${path}${url.search}`

  const headers = new Headers()
  const contentType = request.headers.get('content-type')
  if (contentType) headers.set('content-type', contentType)
  headers.set('accept', request.headers.get('accept') ?? '*/*')
  // Machine auth for the Access-protected render worker (strict service-token
  // auth is default for Zero Trust orgs created after 2026-10-05). Set both
  // env vars in the Pages dashboard; unset = open worker (dev only).
  if (env.CF_ACCESS_CLIENT_ID && env.CF_ACCESS_CLIENT_SECRET) {
    headers.set('CF-Access-Client-Id', env.CF_ACCESS_CLIENT_ID)
    headers.set('CF-Access-Client-Secret', env.CF_ACCESS_CLIENT_SECRET)
  }

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