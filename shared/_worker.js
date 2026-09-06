export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const nonce = crypto.randomUUID().replace(/-/g, '');

    const cspHeader = [
      `default-src 'none'`,
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
      `style-src 'self' 'unsafe-inline'`,
      `img-src 'self' data:`,
      `font-src 'self' data:`,
      `connect-src 'self' https://render.p31ca.org https://gateway.p31ca.org https://static.cloudflareinsights.com`,
      `manifest-src 'self'`,
      `frame-ancestors 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`,
      `upgrade-insecure-requests`,
      `block-all-mixed-content`,
    ].join('; ');

    const securityHeaders = {
      'Content-Security-Policy': cspHeader,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    };

    try {
      let response;
      if (typeof env.ASSETS !== 'undefined') {
        response = await env.ASSETS.fetch(request);
      } else {
        response = await fetch(request);
      }

      if (!response.ok) {
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: { ...Object.fromEntries(response.headers.entries()), ...securityHeaders },
        });
      }

      const contentType = response.headers.get('Content-Type') || '';
      if (!contentType.includes('text/html')) {
        return new Response(response.body, {
          status: response.status,
          headers: { ...Object.fromEntries(response.headers.entries()), ...securityHeaders },
        });
      }

      const body = await response.text();
      const injected = body.replace(/\{\{NONCE\}\}/g, nonce);

      return new Response(injected, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          ...securityHeaders,
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
        },
      });
    } catch (err) {
      return new Response(`Server error: ${err.message}`, { status: 500, headers: securityHeaders });
    }
  },
};
