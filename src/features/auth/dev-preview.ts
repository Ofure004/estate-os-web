import "server-only";
import type { AuthenticatedContext } from "./types";

/** Layout-only fixture. Loaded exclusively in development with no backend configured. */
export function getShellPreview(): AuthenticatedContext {
  if (process.env.NODE_ENV !== "development") throw new Error("Shell preview is development-only");
  return {
    user: { id: "preview-user", email: "preview@example.com", firstName: "Preview", lastName: "Account", phone: null },
    relationships: {
      residencies: [], organizationMemberships: [],
      staffAssignments: [{
        id: "preview-assignment", role: "ESTATE_MANAGER", status: "ACTIVE", startedAt: null, endedAt: null,
        estate: { id: "preview-estate", name: "Palm Grove Estate", organizationId: "preview-organization" },
      }],
    },
  };
}
