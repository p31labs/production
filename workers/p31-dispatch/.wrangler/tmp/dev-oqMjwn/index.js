var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/headers.ts
function passthroughHeaders(request, env) {
  const headers = new Headers(request.headers);
  if (env.P31_DISPATCH_SECRET) {
    headers.set("X-P31-Dispatch-Secret", env.P31_DISPATCH_SECRET);
  }
  return headers;
}
__name(passthroughHeaders, "passthroughHeaders");

// src/rate-limiter.ts
import { DurableObject } from "cloudflare:workers";
var RATE_WINDOW_MS = 6e4;
var RateLimitDO = class extends DurableObject {
  static {
    __name(this, "RateLimitDO");
  }
  windowStart = 0;
  count = 0;
  constructor(ctx, env) {
    super(ctx, env);
  }
  async fetch(request) {
    const url = new URL(request.url);
    const max = Number(url.searchParams.get("max") ?? 0);
    if (!Number.isFinite(max) || max <= 0) {
      return Response.json({ allowed: false, error: "invalid max" }, { status: 400 });
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
      resetAt: this.windowStart + RATE_WINDOW_MS
    });
  }
  async alarm() {
    return;
  }
};

// src/index.ts
var dispatchNamespace = "qpj-dispatch";
var DEFAULT_CPU_MS = 5e3;
var DEFAULT_SUB_REQUESTS = 50;
var MAX_CODE_CHARS = 5e5;
var MAX_FILENAME_CHARS = 128;
var MAX_BUILD_ID_CHARS = 128;
var RATE_GOAL_MAX = 20;
var RATE_BUILD_MAX = 10;
async function rateLimit(env, key, max) {
  const id = env.RATE_LIMITER.idFromName(`${key}:${max}`);
  const stub = env.RATE_LIMITER.get(id);
  try {
    const res = await stub.fetch(
      new Request(`https://rate-limiter.invalid/check?max=${max}`, { method: "POST" })
    );
    const data = await res.json();
    return data.allowed;
  } catch {
    return true;
  }
}
__name(rateLimit, "rateLimit");
var src_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({ ok: true, service: dispatchNamespace, timestamp: Date.now() });
    }
    if (url.pathname === "/ws") {
      return env.PASSPORT_WORKER.fetch(request);
    }
    if (url.pathname === "/api/goal") {
      return handleGoal(request, env);
    }
    if (url.pathname === "/api/build") {
      return handleBuild(request, env);
    }
    if (url.pathname === "/api/status") {
      return handleStatus(request, env);
    }
    if (url.pathname === "/api/verify") {
      return handleVerify(request, env);
    }
    if (url.pathname.startsWith("/api/artifacts/") && request.method === "GET") {
      return handleArtifactProxy(request, env);
    }
    return Response.json({ error: "not found" }, { status: 404 });
  }
};
async function handleGoal(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (!body.passportId) {
    return Response.json({ error: "passportId required" }, { status: 400 });
  }
  if (!await rateLimit(env, `goal:${body.passportId}`, RATE_GOAL_MAX)) {
    return Response.json({
      ok: false,
      type: "goal",
      passportId: body.passportId,
      error: "rate limit exceeded \u2014 retry in 60s"
    }, { status: 429 });
  }
  const limitCheck = checkCustomLimits(body);
  if (!limitCheck.allowed) {
    return Response.json({
      ok: false,
      type: "goal",
      passportId: body.passportId,
      error: "custom limit exceeded",
      cpuMsUsed: limitCheck.cpuMsUsed,
      subRequestsUsed: limitCheck.subRequestsUsed
    }, { status: 429 });
  }
  if (String(env.SUBSTRATE_ENABLED) !== "true") {
    return Response.json({
      ok: false,
      type: "goal",
      passportId: body.passportId,
      error: "substrate disabled \u2014 set SUBSTRATE_ENABLED=true to activate",
      deferred: true
    }, { status: 503 });
  }
  const verification = await verifyRequest(body);
  if (!verification.passed) {
    return Response.json({
      ok: false,
      type: "goal",
      passportId: body.passportId,
      error: "verification failed",
      auditIssues: verification.issues
    }, { status: 403 });
  }
  const targetUrl = `${env.PASSPORT_WORKER_URL}`;
  const bodyToForward = JSON.stringify({
    type: "execute",
    passportId: body.passportId,
    goal: body.goal,
    mode: body.mode,
    autonomy: body.autonomy,
    sessionId: body.sessionId
  });
  try {
    const response = await env.PASSPORT_WORKER.fetch(
      new Request(targetUrl, { method: "POST", headers: passthroughHeaders(request, env), body: bodyToForward })
    );
    const result = await response.json();
    if (result.deferred) {
      return Response.json({
        ok: true,
        type: "goal",
        passportId: body.passportId,
        deferred: true,
        statusUrl: result.statusUrl ?? `/api/status?passportId=${body.passportId}`,
        cpuMsUsed: limitCheck.cpuMsUsed,
        subRequestsUsed: limitCheck.subRequestsUsed
      });
    }
    return Response.json({
      ok: true,
      type: "goal",
      passportId: body.passportId,
      result,
      cpuMsUsed: limitCheck.cpuMsUsed,
      subRequestsUsed: limitCheck.subRequestsUsed
    });
  } catch (e) {
    return Response.json({
      ok: false,
      type: "goal",
      passportId: body.passportId,
      error: errMsg(e, "dispatch failed")
    }, { status: 502 });
  }
}
__name(handleGoal, "handleGoal");
async function handleBuild(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (!body.passportId) {
    return Response.json({ error: "passportId required" }, { status: 400 });
  }
  if (!body.buildId || !body.code || !body.filename) {
    return Response.json({ error: "buildId, code, and filename are required" }, { status: 400 });
  }
  if (body.buildId.length > MAX_BUILD_ID_CHARS) {
    return Response.json({ error: `buildId exceeds maximum length (${MAX_BUILD_ID_CHARS})` }, { status: 413 });
  }
  if (body.code.length > MAX_CODE_CHARS) {
    return Response.json({ error: `code exceeds maximum length (${MAX_CODE_CHARS})` }, { status: 413 });
  }
  if (body.filename.length > MAX_FILENAME_CHARS) {
    return Response.json({ error: `filename exceeds maximum length (${MAX_FILENAME_CHARS})` }, { status: 413 });
  }
  if (!await rateLimit(env, `build:${body.passportId}`, RATE_BUILD_MAX)) {
    return Response.json({
      ok: false,
      type: "build",
      passportId: body.passportId,
      error: "rate limit exceeded \u2014 retry in 60s"
    }, { status: 429 });
  }
  if (String(env.SUBSTRATE_ENABLED) !== "true") {
    return Response.json({
      ok: false,
      type: "build",
      passportId: body.passportId,
      error: "substrate disabled \u2014 set SUBSTRATE_ENABLED=true to activate"
    }, { status: 503 });
  }
  const verification = await verifyRequest(body);
  if (!verification.passed) {
    return Response.json({
      ok: false,
      type: "build",
      passportId: body.passportId,
      error: "verification failed",
      auditIssues: verification.issues
    }, { status: 403 });
  }
  const targetUrl = `${env.PASSPORT_WORKER_URL}`;
  try {
    const response = await env.PASSPORT_WORKER.fetch(
      new Request(targetUrl, {
        method: "POST",
        headers: passthroughHeaders(request, env),
        body: JSON.stringify({
          type: "build",
          passportId: body.passportId,
          buildId: body.buildId,
          code: body.code,
          filename: body.filename
        })
      })
    );
    const data = await response.json();
    return Response.json(
      {
        ok: data.ok,
        type: "build",
        passportId: body.passportId,
        buildId: body.buildId,
        artifactKey: data.artifactKey,
        error: data.error,
        quota: data.quota
      },
      { status: data.ok ? 200 : response.status }
    );
  } catch (e) {
    return Response.json({
      ok: false,
      type: "build",
      passportId: body.passportId,
      buildId: body.buildId,
      error: errMsg(e, "build dispatch failed")
    }, { status: 502 });
  }
}
__name(handleBuild, "handleBuild");
async function handleStatus(request, env) {
  const url = new URL(request.url);
  const passportId = url.searchParams.get("passportId") ?? "";
  if (!passportId) {
    return Response.json({ error: "passportId required" }, { status: 400 });
  }
  const passportWorkerUrl = `${env.PASSPORT_WORKER_URL}`;
  try {
    const response = await env.PASSPORT_WORKER.fetch(
      new Request(`${passportWorkerUrl}/api/status?${url.searchParams.toString()}`, {
        headers: passthroughHeaders(request, env)
      })
    );
    return new Response(response.body, { status: response.status, headers: response.headers });
  } catch (e) {
    return Response.json({ error: errMsg(e, "status check failed") }, { status: 502 });
  }
}
__name(handleStatus, "handleStatus");
async function handleArtifactProxy(request, env) {
  const parts = new URL(request.url).pathname.split("/");
  const passportId = parts[3] ? decodeURIComponent(parts[3]) : "";
  const rest = parts.slice(4).map(decodeURIComponent).join("/");
  if (!passportId || !rest) {
    return Response.json({ error: "passportId, buildId, and filename required" }, { status: 400 });
  }
  const targetUrl = `${env.PASSPORT_WORKER_URL}/api/artifacts/${passportId}/${rest}`;
  try {
    const response = await env.PASSPORT_WORKER.fetch(
      new Request(targetUrl, { headers: passthroughHeaders(request, env) })
    );
    return new Response(response.body, { status: response.status, headers: response.headers });
  } catch (e) {
    return Response.json({ error: errMsg(e, "artifact fetch failed") }, { status: 502 });
  }
}
__name(handleArtifactProxy, "handleArtifactProxy");
function errMsg(e, fallback) {
  return e instanceof Error ? e.message : String(e ?? fallback);
}
__name(errMsg, "errMsg");
async function handleVerify(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const verification = await verifyRequest(body);
  return Response.json({
    ok: verification.passed,
    type: "verify",
    passportId: body.passportId,
    auditIssues: verification.issues
  });
}
__name(handleVerify, "handleVerify");
async function verifyRequest(body) {
  const issues = [];
  if (!body.passportId || body.passportId.length < 3) {
    issues.push("passportId must be at least 3 characters");
  }
  if (body.goal && body.goal.length > 1e4) {
    issues.push("goal exceeds maximum length (10000)");
  }
  if (body.type !== "goal" && body.type !== "verify" && body.type !== "build") {
    issues.push(`unsupported request type: ${body.type}`);
  }
  return { passed: issues.length === 0, issues };
}
__name(verifyRequest, "verifyRequest");
function checkCustomLimits(body) {
  const cpuMs = Number(body.payload?.["cpuMs"] ?? DEFAULT_CPU_MS);
  const subRequests = Number(body.payload?.["subRequests"] ?? DEFAULT_SUB_REQUESTS);
  return {
    allowed: cpuMs <= DEFAULT_CPU_MS && subRequests <= DEFAULT_SUB_REQUESTS,
    cpuMsUsed: Math.min(cpuMs, DEFAULT_CPU_MS),
    subRequestsUsed: Math.min(subRequests, DEFAULT_SUB_REQUESTS)
  };
}
__name(checkCustomLimits, "checkCustomLimits");

// ../../../node_modules/.pnpm/wrangler@4.131.0_@cloudflare+workers-types@4.20260702.1_@types+node@25.9.6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../node_modules/.pnpm/wrangler@4.131.0_@cloudflare+workers-types@4.20260702.1_@types+node@25.9.6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-qtoy8P/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../../../node_modules/.pnpm/wrangler@4.131.0_@cloudflare+workers-types@4.20260702.1_@types+node@25.9.6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-qtoy8P/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  RateLimitDO,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
