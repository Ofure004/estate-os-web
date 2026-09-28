/** Explicit transport allowlist. Backend authorization still applies to every request. */
export function allowedOperation(method: string, path: string) {
  if (method === "GET" && path === "auth/me") return true;
  if (method === "POST" && path === "auth/login") return true;
  if (method === "POST" && path === "auth/refresh") return true;
  const id = "[A-Za-z0-9_-]+";
  const base = `estates/${id}`;
  if (method === "GET" && new RegExp(`^onboarding/invitations/${id}$`).test(path)) return true;
  if (method === "POST" && new RegExp(`^onboarding/invitations/${id}/accept$`).test(path)) return true;
  if (method === "GET" && new RegExp(`^${base}/onboarding/invitations$`).test(path)) return true;
  if (method === "POST" && new RegExp(`^${base}/onboarding/(resident-invitations|staff-invitations|invitations/${id}/revoke)$`).test(path)) return true;
  if (method === "GET") return new RegExp(`^${base}/(visitor-invitations(?:/${id}(?:/pass)?)?|access/(onsite|activity|visitors)|gates)$`).test(path);
  if (method === "POST") return new RegExp(`^${base}/(visitor-invitations|gates/${id}/access/(verify|check-in|check-out))$`).test(path);
  return method === "PATCH" && new RegExp(`^${base}/visitor-invitations/${id}/cancel$`).test(path);
}
