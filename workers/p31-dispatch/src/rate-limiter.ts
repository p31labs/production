import { DurableObject } from 'cloudflare:workers';

const RATE_WINDOW_MS = 60_000;

export class RateLimitDO extends DurableObject<Env> {
  private windowStart = 0;
  private count = 0;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const max = Number(url.searchParams.get('max') ?? 0);
    if (!Number.isFinite(max) || max <= 0) {
      return Response.json({ allowed: false, error: 'invalid max' }, { status: 400 });
    }

    const now = Date.now();
    if (now - this.windowStart >= RATE_WINDOW_MS || this.windowStart === 0) {
      this.windowStart = now;
      this.count = 0;
    }
    this.count += 1;
    const allowed = this.count <= max;
    return Response.json({
      allowed,
      count: this.count,
      max,
      windowStart: this.windowStart,
      resetAt: this.windowStart + RATE_WINDOW_MS,
    });
  }

  async alarm(): Promise<void> {
    return;
  }
}