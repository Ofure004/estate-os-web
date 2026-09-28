import { cookies } from "next/headers";
import { clearSession, isAuthTokens, refreshCookieName, refreshSession, sessionCookieName, writeSession, RefreshError } from "@/features/auth/session";
import { allowedOperation } from "@/lib/api/proxy-policy";

async function handle(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const path = (await context.params).path.join("/");
  if (!allowedOperation(request.method, path)) return Response.json({ message: "Not found" }, { status: 404 });
  if (request.method !== "GET" && request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json({ message: "Invalid request origin" }, { status: 403 });
  const base = process.env.ESTATEOS_API_URL;
  if (!base) return Response.json({ message: "Service not configured" }, { status: 503 });
  const store = await cookies();
  const login = path === "auth/login";
  const renew = path === "auth/refresh";
  const recipient = /^onboarding\/invitations\/[A-Za-z0-9_-]+(?:\/accept)?$/.test(path);
  const accepting = recipient && path.endsWith("/accept");
  const requestBody = request.method === "GET" ? undefined : (await request.text()) || undefined;
  let existingAcceptance = false;
  if (accepting) {
    try {
      const body = JSON.parse(requestBody || "null");
      if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
      const keys = Object.keys(body);
      existingAcceptance = keys.length === 0;
      if (!existingAcceptance && (keys.length !== 3 || !["firstName", "lastName", "password"].every((key) => keys.includes(key)))) throw new Error();
      if (!existingAcceptance && (!["firstName", "lastName"].every((key) => typeof body[key] === "string" && body[key] === body[key].trim() && body[key].length > 0 && body[key].length <= 100) || typeof body.password !== "string" || body.password.length < 12 || body.password.length > 128)) throw new Error();
    } catch { return Response.json({ message: "Invalid acceptance details" }, { status: 400 }); }
  }
  const refreshToken = store.get(refreshCookieName)?.value;
  if (renew) {
    if (!refreshToken) return Response.json({ message: "Please sign in" }, { status: 401 });
    try {
      writeSession(store, await refreshSession(base, refreshToken));
      return Response.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      if (error instanceof RefreshError && error.status === 401) clearSession(store);
      return Response.json({ message: error instanceof RefreshError && error.status === 401 ? "Please sign in" : "Session renewal unavailable" }, { status: error instanceof RefreshError && error.status === 401 ? 401 : 502 });
    }
  }
  let token = store.get(sessionCookieName)?.value;
  if (!login && !recipient && !token && !refreshToken) return Response.json({ message: "Please sign in" }, { status: 401 });
  try {
    if (!login && (!recipient || existingAcceptance) && !token && refreshToken) {
      try { const renewed = await refreshSession(base, refreshToken); writeSession(store, renewed); token = renewed.accessToken; }
      catch (error) {
        if (error instanceof RefreshError && error.status === 401) clearSession(store);
        return Response.json({ message: error instanceof RefreshError && error.status === 401 ? "Please sign in" : "Session renewal unavailable" }, { status: error instanceof RefreshError && error.status === 401 ? 401 : 502 });
      }
    }
    const url = `${base.replace(/\/$/, "")}/${path}${new URL(request.url).search}`;
    if (existingAcceptance) {
      if (!token) return Response.json({ message: "Please sign in" }, { status: 401 });
      const details = await fetch(`${base.replace(/\/$/, "")}/${path.slice(0, -7)}`, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15_000) });
      const invitation = await details.json().catch(() => null);
      if (!details.ok) return Response.json(invitation, { status: details.status, headers: { "Cache-Control": "no-store" } });
      const fetchIdentity = (accessToken: string) => fetch(`${base.replace(/\/$/, "")}/auth/me`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15_000) });
      let identity = await fetchIdentity(token);
      if (identity.status === 401 && refreshToken) {
        try { const renewed = await refreshSession(base, refreshToken); writeSession(store, renewed); token = renewed.accessToken; identity = await fetchIdentity(token); }
        catch { return Response.json({ message: "Please sign in" }, { status: 401 }); }
      }
      const user = await identity.json().catch(() => null);
      if (!identity.ok) return Response.json({ message: "Please sign in" }, { status: identity.status === 401 ? 401 : 502 });
      if (!invitation || !user || typeof invitation.email !== "string" || typeof user.email !== "string" || invitation.email.toLowerCase() !== user.email.toLowerCase())
        return Response.json({ code: "INVITATION_EMAIL_MISMATCH" }, { status: 403, headers: { "Cache-Control": "no-store" } });
    }
    const forward = (accessToken?: string) => fetch(url, {
      method: request.method, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15_000),
      headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
      body: requestBody,
    });
    let upstream = await forward(login || (recipient && !existingAcceptance) ? undefined : token);
    if (!login && (!recipient || existingAcceptance) && upstream.status === 401 && refreshToken) {
      try {
        const renewed = await refreshSession(base, refreshToken);
        writeSession(store, renewed);
        upstream = await forward(renewed.accessToken);
      } catch (error) {
        if (error instanceof RefreshError && error.status === 401) clearSession(store);
        return Response.json({ message: error instanceof RefreshError && error.status === 401 ? "Please sign in" : "Session renewal unavailable" }, { status: error instanceof RefreshError && error.status === 401 ? 401 : 502 });
      }
    }
    const body = await upstream.json().catch(() => null);
    if (login && upstream.ok) {
      if (!isAuthTokens(body))
        return Response.json({ message: "Invalid login response" }, { status: 502 });
      writeSession(store, body);
      return Response.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
    }
    if (upstream.status === 401 && !recipient) clearSession(store);
    return Response.json(body, { status: upstream.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ message: "Service unavailable" }, { status: 502 });
  }
}
export { handle as GET, handle as POST, handle as PATCH };
