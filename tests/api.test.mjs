import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
async function moduleUrl(path, replace = (s) => s) {
  const source = replace(await readFile(new URL(path, import.meta.url), "utf8"));
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
  return `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
}
const policyUrl = await moduleUrl("../src/lib/api/proxy-policy.ts");
const sessionUrl = await moduleUrl("../src/features/auth/session.ts", s => s.replace('import "server-only";', ''));
const sessionModule = await import(sessionUrl);
const { allowedOperation } = await import(policyUrl);
const { normalizeError, requireSuccessfulResult } = await import(await moduleUrl("../src/lib/api/errors.ts"));
const { invitationBadgeValues } = await import(await moduleUrl("../src/features/access/visit-status.ts"));
const { contextSchema } = await import(await moduleUrl("../src/features/auth/context-schema.ts", s => s.replace('"zod"', JSON.stringify(import.meta.resolve("zod")))));

test("proxy only exposes the supported access operations", () => {
  for (const [method, path] of [["GET", "auth/me"], ["POST", "auth/login"], ["POST", "auth/refresh"], ["GET", "estates/a/gates"], ["GET", "estates/a/access/visitors"], ["GET", "estates/a/visitor-invitations/i/pass"], ["PATCH", "estates/a/visitor-invitations/i/cancel"], ["POST", "estates/a/gates/g/access/check-out"]]) assert.equal(allowedOperation(method, path), true);
  for (const [method, path] of [["GET", "https://evil.example"], ["POST", "auth/register"], ["DELETE", "estates/a/access/activity"], ["PATCH", "estates/a/visitor-invitations/i"], ["GET", "estates/../users"], ["GET", "estates/a%2fb/gates"]]) assert.equal(allowedOperation(method, path), false);
});
test("proxy allows only onboarding invitation operations", () => {
  for (const [method, path] of [["GET", "onboarding/invitations/t"], ["POST", "onboarding/invitations/t/accept"], ["GET", "estates/e/onboarding/invitations"], ["POST", "estates/e/onboarding/resident-invitations"], ["POST", "estates/e/onboarding/staff-invitations"], ["POST", "estates/e/onboarding/invitations/i/revoke"]]) assert.equal(allowedOperation(method, path), true);
  for (const [method, path] of [["PATCH", "onboarding/invitations/t"], ["GET", "estates/e/onboarding/resident-invitations"], ["POST", "estates/e/onboarding/invitations/i/accept"], ["POST", "onboarding/invitations/t%2Fadmin/accept"]]) assert.equal(allowedOperation(method, path), false);
});
test("onboarding business errors present actionable messages", () => {
  for (const code of ["INVITATION_NOT_FOUND", "INVITATION_EXPIRED", "INVITATION_REVOKED", "INVITATION_ALREADY_ACCEPTED", "INVITATION_ALREADY_PENDING", "INVITATION_EMAIL_MISMATCH", "RELATIONSHIP_ALREADY_EXISTS", "UNIT_NOT_IN_ESTATE", "ROLE_NOT_ASSIGNABLE"]) {
    const error = normalizeError(409, { code });
    assert.equal(error.code, code); assert.ok(error.message.length > 15); assert.doesNotMatch(error.message, /This visit changed/);
  }
});
test("business codes survive normalization; validation arrays and session errors are usable", () => {
  const error = normalizeError(400, { code: "HOST_RESIDENCY_REQUIRED", message: "raw detail" });
  assert.equal(error.code, "HOST_RESIDENCY_REQUIRED"); assert.match(error.message, /Choose the unit/);
  assert.equal(normalizeError(400, { message: ["Name required", "Date required"] }).message, "Name required. Date required");
  assert.match(normalizeError(401, null).message, /sign in again/);
  assert.match(normalizeError(404, null).message, /no longer available/);
  assert.match(normalizeError(409, null).message, /changed/);
  assert.doesNotMatch(normalizeError(500, { message: "database credentials" }).message, /credentials/);
});
test("identity-only context is rejected; relationship context retains estate and unit scope", () => {
  const user = { id: "u", email: "u@example.com" };
  assert.equal(contextSchema.safeParse(user).success, false);
  const data = contextSchema.parse({ ...user, memberships: [], staffAssignments: [], residencies: [{ id: "r", status: "ACTIVE", unit: { id: "unit", name: "Flat C4", code: "C4", estate: { id: "estate", name: "Palm Grove" } } }] });
  assert.equal(data.residencies[0].unit.estate.id, "estate"); assert.equal(data.residencies[0].startedAt, null);
});
const route = await import(await moduleUrl("../src/app/api/backend/[...path]/route.ts", s => s
  .replace('import { cookies } from "next/headers";', 'const cookies = async () => globalThis.__cookieStore;')
  .replace('"@/features/auth/session"', JSON.stringify(sessionUrl))
  .replace('"@/lib/api/proxy-policy"', JSON.stringify(policyUrl))));
test("session proxy stores JWT privately, forwards it server-side, and rejects cross-origin writes", async () => {
  const originalFetch = globalThis.fetch; const originalUrl = process.env.ESTATEOS_API_URL;
  process.env.ESTATEOS_API_URL = "http://backend.test";
  const stored = new Map(); let cookieOptions; let forwarded;
  globalThis.__cookieStore = { get: name => stored.has(name) ? { value: stored.get(name) } : undefined, set: (name, value, options) => { stored.set(name, value); cookieOptions = options; }, delete: name => { stored.delete(name); } };
  const ctx = path => ({ params: Promise.resolve({ path: path.split("/") }) });
  const post = (origin = "http://web.test") => new Request("http://web.test/api/backend/auth/login", { method: "POST", headers: { origin, "content-type": "application/json" }, body: '{"email":"u@example.com","password":"password"}' });
  try {
    globalThis.fetch = async (url, options) => { forwarded = { url, options }; return Response.json({ accessToken: "private-jwt", expiresIn: 900, refreshToken: "private-refresh", refreshExpiresAt: new Date(Date.now() + 86_400_000).toISOString(), user: { id: "u" } }); };
    assert.equal((await route.POST(post("http://evil.test"), ctx("auth/login"))).status, 403);
    assert.equal(forwarded, undefined);
    const login = await route.POST(post(), ctx("auth/login"));
    assert.deepEqual(await login.json(), { success: true }); assert.equal(stored.get(sessionModule.sessionCookieName), "private-jwt"); assert.equal(stored.get(sessionModule.refreshCookieName), "private-refresh");
    assert.equal(cookieOptions.httpOnly, true); assert.equal(cookieOptions.sameSite, "lax");
    globalThis.fetch = async (url, options) => { forwarded = { url, options }; return Response.json([]); };
    const response = await route.GET(new Request("http://web.test/api/backend/estates/e/access/activity?page=2&limit=20"), ctx("estates/e/access/activity"));
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(forwarded.options.headers.Authorization, "Bearer private-jwt"); assert.equal(forwarded.options.cache, "no-store");
    assert.equal(forwarded.url, "http://backend.test/estates/e/access/activity?page=2&limit=20");
    globalThis.fetch = async () => Response.json({ message: "Unauthorized" }, { status: 401 });
    await route.GET(new Request("http://web.test/api/backend/auth/me"), ctx("auth/me")); assert.equal(stored.has(sessionModule.sessionCookieName), false);
    assert.equal((await route.GET(new Request("http://web.test/api/backend/auth/me"), ctx("auth/me"))).status, 401);
  } finally { globalThis.fetch = originalFetch; delete globalThis.__cookieStore; if (originalUrl === undefined) delete process.env.ESTATEOS_API_URL; else process.env.ESTATEOS_API_URL = originalUrl; }
});

test("HTTP-success gate rejections cannot be shown as successful visits", () => {
  for (const result of [{ valid: false, status: "EXPIRED" }, { success: false, status: "ALREADY_CHECKED_IN" }, { success: false, status: "NOT_CHECKED_IN" }]) {
    assert.throws(() => requireSuccessfulResult(result), error => error.code === result.status);
  }
  const departure = { success: true, status: "CHECKED_OUT" };
  assert.equal(requireSuccessfulResult(departure), departure);
  assert.equal(requireSuccessfulResult({ valid: true, status: "VALID" }).status, "VALID");
});

test("arrival and lifecycle badges remain separate after cancellation or expiry", () => {
  assert.deepEqual(invitationBadgeValues({ visitStatus: "CHECKED_IN", status: "CANCELLED" }), ["CHECKED_IN", "CANCELLED"]);
  assert.deepEqual(invitationBadgeValues({ visitStatus: "NOT_ARRIVED", status: "EXPIRED" }), ["NOT_ARRIVED", "EXPIRED"]);
});

test("concurrent expired requests rotate once and retry with the replacement access token", async () => {
  const originalFetch = globalThis.fetch; const originalUrl = process.env.ESTATEOS_API_URL;
  process.env.ESTATEOS_API_URL = "http://backend.test";
  const stored = new Map([[sessionModule.sessionCookieName, "expired-access"], [sessionModule.refreshCookieName, "shared-refresh"]]);
  globalThis.__cookieStore = { get: name => stored.has(name) ? { value: stored.get(name) } : undefined, set: (name, value) => stored.set(name, value), delete: name => stored.delete(name) };
  let refreshes = 0; let retried = 0;
  globalThis.fetch = async (url, options) => {
    if (url.endsWith("/auth/refresh")) {
      refreshes++;
      assert.deepEqual(JSON.parse(options.body), { refreshToken: "shared-refresh" });
      await new Promise(resolve => setTimeout(resolve, 10));
      return Response.json({ accessToken: "new-access", expiresIn: 900, refreshToken: "new-refresh", refreshExpiresAt: new Date(Date.now() + 86_400_000).toISOString() });
    }
    if (options.headers.Authorization === "Bearer expired-access") return Response.json({ message: "expired" }, { status: 401 });
    assert.equal(options.headers.Authorization, "Bearer new-access"); retried++;
    return Response.json({ data: [] });
  };
  const ctx = { params: Promise.resolve({ path: ["estates", "e", "gates"] }) };
  try {
    const responses = await Promise.all(Array.from({ length: 3 }, () => route.GET(new Request("http://web.test/api/backend/estates/e/gates"), ctx)));
    assert.ok(responses.every(response => response.ok));
    assert.equal(refreshes, 1); assert.equal(retried, 3);
    assert.equal(stored.get(sessionModule.sessionCookieName), "new-access");
    assert.equal(stored.get(sessionModule.refreshCookieName), "new-refresh");
    assert.equal(sessionModule.latestRefreshToken("shared-refresh"), "new-refresh");
  } finally { globalThis.fetch = originalFetch; delete globalThis.__cookieStore; if (originalUrl === undefined) delete process.env.ESTATEOS_API_URL; else process.env.ESTATEOS_API_URL = originalUrl; }
});

test("refresh server errors retain cookies, while rejected refresh clears them", async () => {
  const originalFetch = globalThis.fetch; const originalUrl = process.env.ESTATEOS_API_URL;
  process.env.ESTATEOS_API_URL = "http://backend.test";
  const stored = new Map([[sessionModule.refreshCookieName, "failing-refresh"]]);
  globalThis.__cookieStore = { get: name => stored.has(name) ? { value: stored.get(name) } : undefined, set: (name, value) => stored.set(name, value), delete: name => stored.delete(name) };
  const ctx = { params: Promise.resolve({ path: ["auth", "refresh"] }) };
  const request = () => new Request("http://web.test/api/backend/auth/refresh", { method: "POST", headers: { origin: "http://web.test" } });
  try {
    globalThis.fetch = async () => Response.json({ message: "down" }, { status: 503 });
    assert.equal((await route.POST(request(), ctx)).status, 502);
    assert.equal(stored.get(sessionModule.refreshCookieName), "failing-refresh");
    globalThis.fetch = async () => Response.json({ message: "invalid" }, { status: 401 });
    assert.equal((await route.POST(request(), ctx)).status, 401);
    assert.equal(stored.has(sessionModule.refreshCookieName), false);
  } finally { globalThis.fetch = originalFetch; delete globalThis.__cookieStore; if (originalUrl === undefined) delete process.env.ESTATEOS_API_URL; else process.env.ESTATEOS_API_URL = originalUrl; }
});

test("new recipient acceptance never forwards a saved bearer token; existing acceptance checks email first", async () => {
  const originalFetch = globalThis.fetch; const originalUrl = process.env.ESTATEOS_API_URL;
  process.env.ESTATEOS_API_URL = "http://backend.test";
  const stored = new Map([[sessionModule.sessionCookieName, "wrong-user-jwt"]]);
  globalThis.__cookieStore = { get: name => stored.has(name) ? { value: stored.get(name) } : undefined, set: (name, value) => stored.set(name, value), delete: name => stored.delete(name) };
  const ctx = { params: Promise.resolve({ path: ["onboarding", "invitations", "secret", "accept"] }) };
  const request = body => new Request("http://web.test/api/backend/onboarding/invitations/secret/accept", { method: "POST", headers: { origin: "http://web.test", "content-type": "application/json" }, body: JSON.stringify(body) });
  let accepted = 0;
  try {
    globalThis.fetch = async (url, options) => {
      if (url.endsWith("/auth/me")) return Response.json({ email: "wrong@example.com" });
      if (url.endsWith("/secret")) return Response.json({ email: "invite@example.com", existingUser: true });
      if (url.endsWith("/accept")) { accepted++; assert.equal(options.headers.Authorization, undefined); assert.deepEqual(JSON.parse(options.body), { firstName: "Jane", lastName: "Doe", password: "long-password-123" }); return Response.json({ status: "ACCEPTED" }); }
      throw new Error("Unexpected URL");
    };
    assert.equal((await route.POST(request({ firstName: "Jane", lastName: "Doe", password: "long-password-123" }), ctx)).status, 200);
    const mismatch = await route.POST(request({}), ctx);
    assert.equal(mismatch.status, 403); assert.equal((await mismatch.json()).code, "INVITATION_EMAIL_MISMATCH");
    assert.equal(accepted, 1);
    globalThis.fetch = async (url, options) => {
      if (url.endsWith("/auth/me")) return Response.json({ email: "INVITE@example.com" });
      if (url.endsWith("/secret")) return Response.json({ email: "invite@example.com", existingUser: true });
      if (url.endsWith("/accept")) { accepted++; assert.equal(options.headers.Authorization, "Bearer wrong-user-jwt"); assert.deepEqual(JSON.parse(options.body), {}); return Response.json({ status: "ACCEPTED" }); }
      throw new Error("Unexpected URL");
    };
    assert.equal((await route.POST(request({}), ctx)).status, 200); assert.equal(accepted, 2);
    assert.equal((await route.POST(request({ email: "forged@example.com" }), ctx)).status, 400);
  } finally { globalThis.fetch = originalFetch; delete globalThis.__cookieStore; if (originalUrl === undefined) delete process.env.ESTATEOS_API_URL; else process.env.ESTATEOS_API_URL = originalUrl; }
});
