import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { identitySchema, contextSchema } from "./context-schema";
import type { AuthenticatedContext } from "./types";
import { refreshCookieName, sessionCookieName } from "./session";

export type DashboardContext =
  | { status: "ready"; context: AuthenticatedContext }
  | { status: "unconfigured" | "unauthenticated" | "unavailable" | "context-unavailable" | "refresh-required" };

export const loadDashboardContext = cache(async (): Promise<DashboardContext> => {
  // Read request state even before configuration checks, so protected routes are
  // never prerendered with build-time authentication/configuration state.
  const cookieStore = await cookies();
  const apiUrl = process.env.ESTATEOS_API_URL;
  if (!apiUrl) return { status: "unconfigured" };
  const token = cookieStore.get(sessionCookieName)?.value;
  if (!token) return { status: cookieStore.get(refreshCookieName) ? "refresh-required" : "unauthenticated" };

  try {
    const response = await fetch(`${apiUrl.replace(/\/$/, "")}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 401) return { status: cookieStore.get(refreshCookieName) ? "refresh-required" : "unauthenticated" };
    if (response.status === 403) return { status: "unauthenticated" };
    if (!response.ok) return { status: "unavailable" };
    const body = await response.json();
    const result = identitySchema.safeParse(body);
    if (!result.success) return { status: "unavailable" };

    const context = contextSchema.safeParse(body);
    if (!context.success) return { status: "context-unavailable" };
    return { status: "ready", context: {
      user: result.data,
      relationships: { residencies: context.data.residencies, staffAssignments: context.data.staffAssignments, organizationMemberships: context.data.memberships },
    } };
  } catch {
    return { status: "unavailable" };
  }
});
