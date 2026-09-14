export function passthroughHeaders(request: Request, env: { P31_DISPATCH_SECRET?: string }): Headers {
  const headers = new Headers(request.headers);
  if (env.P31_DISPATCH_SECRET) {
    headers.set('X-P31-Dispatch-Secret', env.P31_DISPATCH_SECRET);
  }
  return headers;
}