import { cookies } from "next/headers";
import { sessionCookieName } from "@/features/auth/server";
import { allowedOperation } from "@/lib/api/proxy-policy";

async function handle(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const path = (await context.params).path.join("/");
  if (!allowedOperation(request.method, path)) return Response.json({ message: "Not found" }, { status: 404 });
  if (request.method !== "GET" && request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json({ message: "Invalid request origin" }, { status: 403 });
  const base = process.env.ESTATEOS_API_URL;
  if (!base) return Response.json({ message: "Service not configured" }, { status: 503 });
  const store = await cookies();
  const token = store.get(sessionCookieName)?.value;
  const login = path === "auth/login";
  if (!login && !token) return Response.json({ message: "Please sign in" }, { status: 401 });
  try {
    const upstream = await fetch(`${base.replace(/\/$/, "")}/${path}${new URL(request.url).search}`, {
      method: request.method, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15_000),
      headers: { "Content-Type": "application/json", ...(!login ? { Authorization: `Bearer ${token}` } : {}) },
      body: request.method === "GET" ? undefined : (await request.text()) || undefined,
    });
    const body = await upstream.json().catch(() => null);
    if (login && upstream.ok) {
      if (typeof body?.accessToken !== "string" || !Number.isFinite(body?.expiresIn) || body.expiresIn <= 0)
        return Response.json({ message: "Invalid login response" }, { status: 502 });
      store.set(sessionCookieName, body.accessToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: body.expiresIn });
      return Response.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
    }
    if (upstream.status === 401) store.delete(sessionCookieName);
    return Response.json(body, { status: upstream.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ message: "Service unavailable" }, { status: 502 });
  }
}
export { handle as GET, handle as POST, handle as PATCH };
