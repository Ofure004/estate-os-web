/** Explicit transport allowlist. Backend authorization still applies to every request. */
export function allowedOperation(method: string, path: string) {
  if (method === "GET" && path === "auth/me") return true;
  if (method === "POST" && path === "auth/login") return true;
  const id = "[A-Za-z0-9_-]+";
  const base = `estates/${id}`;
  if (method === "GET") return new RegExp(`^${base}/(visitor-invitations(?:/${id}(?:/pass)?)?|access/(onsite|activity)|gates)$`).test(path);
  if (method === "POST") return new RegExp(`^${base}/(visitor-invitations|gates/${id}/access/(verify|check-in|check-out))$`).test(path);
  return method === "PATCH" && new RegExp(`^${base}/visitor-invitations/${id}/cancel$`).test(path);
}
