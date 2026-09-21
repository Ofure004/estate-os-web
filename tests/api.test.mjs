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
const { allowedOperation } = await import(policyUrl);
const { normalizeError, requireSuccessfulResult } = await import(await moduleUrl("../src/lib/api/errors.ts"));
const { contextSchema } = await import(await moduleUrl("../src/features/auth/context-schema.ts", s => s.replace('"zod"', JSON.stringify(import.meta.resolve("zod")))));

test("proxy only exposes the supported access operations", () => {
  for (const [method, path] of [["GET", "auth/me"], ["POST", "auth/login"], ["GET", "estates/a/gates"], ["GET", "estates/a/visitor-invitations/i/pass"], ["PATCH", "estates/a/visitor-invitations/i/cancel"], ["POST", "estates/a/gates/g/access/check-out"]]) assert.equal(allowedOperation(method, path), true);
  for (const [method, path] of [["GET", "https://evil.example"], ["POST", "auth/register"], ["DELETE", "estates/a/access/activity"], ["PATCH", "estates/a/visitor-invitations/i"], ["GET", "estates/../users"], ["GET", "estates/a%2fb/gates"]]) assert.equal(allowedOperation(method, path), false);
});
test("business codes survive normalization; validation arrays and session errors are usable", () => {
  const error = normalizeError(400, { code: "HOST_RESIDENCY_REQUIRED", message: "raw detail" });
  assert.equal(error.code, "HOST_RESIDENCY_REQUIRED"); assert.match(error.message, /Choose the unit/);
  assert.equal(normalizeError(400, { message: ["Name required", "Date required"] }).message, "Name required. Date required");
  assert.match(normalizeError(401, null).message, /sign in again/);
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
  .replace('import { sessionCookieName } from "@/features/auth/server";', 'const sessionCookieName = "estateos_session";')
  .replace('"@/lib/api/proxy-policy"', JSON.stringify(policyUrl))));
test("session proxy stores JWT privately, forwards it server-side, and rejects cross-origin writes", async () => {
  const originalFetch = globalThis.fetch; const originalUrl = process.env.ESTATEOS_API_URL;
  process.env.ESTATEOS_API_URL = "http://backend.test";
  let session; let cookieOptions; let forwarded;
  globalThis.__cookieStore = { get: () => session ? { value: session } : undefined, set: (_name, value, options) => { session = value; cookieOptions = options; }, delete: () => { session = undefined; } };
  const ctx = path => ({ params: Promise.resolve({ path: path.split("/") }) });
  const post = (origin = "http://web.test") => new Request("http://web.test/api/backend/auth/login", { method: "POST", headers: { origin, "content-type": "application/json" }, body: '{"email":"u@example.com","password":"password"}' });
  try {
    globalThis.fetch = async (url, options) => { forwarded = { url, options }; return Response.json({ accessToken: "private-jwt", expiresIn: 900, user: { id: "u" } }); };
    assert.equal((await route.POST(post("http://evil.test"), ctx("auth/login"))).status, 403);
    assert.equal(forwarded, undefined);
    const login = await route.POST(post(), ctx("auth/login"));
    assert.deepEqual(await login.json(), { success: true }); assert.equal(session, "private-jwt");
    assert.equal(cookieOptions.httpOnly, true); assert.equal(cookieOptions.sameSite, "lax"); assert.equal(cookieOptions.maxAge, 900);
    globalThis.fetch = async (url, options) => { forwarded = { url, options }; return Response.json([]); };
    const response = await route.GET(new Request("http://web.test/api/backend/estates/e/access/activity?page=2&limit=20"), ctx("estates/e/access/activity"));
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(forwarded.options.headers.Authorization, "Bearer private-jwt"); assert.equal(forwarded.options.cache, "no-store");
    assert.equal(forwarded.url, "http://backend.test/estates/e/access/activity?page=2&limit=20");
    globalThis.fetch = async () => Response.json({ message: "Unauthorized" }, { status: 401 });
    await route.GET(new Request("http://web.test/api/backend/auth/me"), ctx("auth/me")); assert.equal(session, undefined);
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
