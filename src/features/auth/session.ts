import "server-only";

import type { cookies } from "next/headers";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

export const sessionCookieName = process.env.ESTATEOS_SESSION_COOKIE || "estateos_session";
export const refreshCookieName = `${sessionCookieName}_refresh`;

export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  refreshExpiresAt: string;
}

export function isAuthTokens(value: unknown): value is AuthTokens {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return typeof data.accessToken === "string" && !!data.accessToken
    && typeof data.refreshToken === "string" && !!data.refreshToken
    && typeof data.expiresIn === "number" && Number.isFinite(data.expiresIn) && data.expiresIn > 0
    && typeof data.refreshExpiresAt === "string" && Date.parse(data.refreshExpiresAt) > Date.now();
}

export function writeSession(store: CookieStore, tokens: AuthTokens) {
  const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
  store.set(sessionCookieName, tokens.accessToken, { ...options, maxAge: tokens.expiresIn });
  store.set(refreshCookieName, tokens.refreshToken, { ...options, expires: new Date(tokens.refreshExpiresAt) });
}

export function clearSession(store: CookieStore) {
  store.delete(sessionCookieName);
  store.delete(refreshCookieName);
}

export class RefreshError extends Error {
  constructor(public status: number) { super("Session refresh failed"); }
}

const inFlight = new Map<string, Promise<AuthTokens>>();
const recent = new Map<string, { tokens: AuthTokens; until: number }>();

export function latestRefreshToken(token: string) {
  const match = recent.get(token);
  if (match && match.until > Date.now()) return match.tokens.refreshToken;
  if (match) recent.delete(token);
  return token;
}

/** Rotation is shared between requests carrying the same cookie in this server process. */
export function refreshSession(base: string, token: string): Promise<AuthTokens> {
  const cached = recent.get(token);
  if (cached && cached.until > Date.now()) return Promise.resolve(cached.tokens);
  if (cached) recent.delete(token);
  const existing = inFlight.get(token);
  if (existing) return existing;
  const pending = (async () => {
    let response: Response;
    try {
      response = await fetch(`${base.replace(/\/$/, "")}/auth/refresh`, {
        method: "POST", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15_000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: token }),
      });
    } catch { throw new RefreshError(502); }
    if (!response.ok) throw new RefreshError(response.status);
    const body: unknown = await response.json().catch(() => null);
    if (!isAuthTokens(body)) throw new RefreshError(502);
    recent.set(token, { tokens: body, until: Date.now() + 30_000 });
    setTimeout(() => recent.delete(token), 30_000).unref();
    return body;
  })();
  inFlight.set(token, pending);
  void pending.finally(() => inFlight.delete(token)).catch(() => {});
  return pending;
}
