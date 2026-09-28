import { normalizeError } from "./errors";
export async function api<T>(path: string, options: { method?: "GET" | "POST" | "PATCH"; body?: unknown; signal?: AbortSignal; redirectOnUnauthorized?: boolean } = {}): Promise<T> {
  const response = await fetch(`/api/backend/${path}`, {
    method: options.method || "GET", credentials: "same-origin", cache: "no-store", signal: options.signal,
    headers: options.body === undefined ? undefined : { "Content-Type": "application/json" },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const body: unknown = await response.json().catch(() => null);
  if (response.status === 401 && path !== "auth/login" && options.redirectOnUnauthorized !== false) window.location.replace("/login");
  if (!response.ok) throw normalizeError(response.status, body);
  return body as T;
}
