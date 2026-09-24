import type { PagesFunction } from '@cloudflare/workers-types'

interface Env {
  CF_ACCESS_TEAM_DOMAIN?: string
  CF_ACCESS_AUD?: string
}

/**
 * Middleware that runs before all /api/* routes.
 *
 * Honest posture: the Access plugin is NOT wired yet for the landing. This
 * documents the intended posture and passes through when Access is not
 * configured. When CF_ACCESS_TEAM_DOMAIN and CF_ACCESS_AUD are set, the
 * @cloudflare/pages-plugin-cloudflare-access middleware should be used here.
 */
export const onRequest: PagesFunction<Env> = async (context) => {
  const { env, next } = context

  if (!env.CF_ACCESS_TEAM_DOMAIN || !env.CF_ACCESS_AUD) {
    return next()
  }

  const jwt = context.request.headers.get('Cf-Access-Jwt-Assertion')
  if (!jwt) {
    return new Response('Unauthorized: missing Access JWT', { status: 401 })
  }

  return next()
}