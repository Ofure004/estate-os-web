import type { Workspace } from "@/features/auth/types";

export const staffRoles = ["GUARD", "SECURITY_SUPERVISOR", "FACILITY_MANAGER", "ESTATE_MANAGER"] as const;
export const residencyTypes = ["OWNER", "TENANT", "OCCUPANT", "DEPENDENT"] as const;
export type StaffRole = typeof staffRoles[number];
export type ResidencyType = typeof residencyTypes[number];

export interface InvitationDetails {
  type: "RESIDENT" | "STAFF";
  email: string;
  expiresAt: string;
  estate: { id: string; name: string; organization?: { name: string } };
  existingUser: boolean;
  unit?: { id: string; name: string; code?: string };
  residencyType?: ResidencyType;
  role?: StaffRole;
}

export interface InvitationRecord extends Partial<InvitationDetails> {
  id: string;
  email: string;
  type: "RESIDENT" | "STAFF";
  status: string;
  effectiveStatus: string;
  createdAt: string;
  updatedAt?: string;
  expiresAt: string;
  acceptedAt?: string | null;
  revokedAt?: string | null;
  unitId?: string;
}

export interface CreatedInvitation { id: string; inviteToken?: string }
export interface AcceptedInvitation { invitationId: string; status: "ACCEPTED"; userId: string; type: "RESIDENT" | "STAFF" }

export function invitationPermissions(workspace: Workspace | null) {
  if (workspace?.type === "organization" && (workspace.role === "OWNER" || workspace.role === "ADMIN"))
    return { resident: true, staff: [...staffRoles] };
  if (workspace?.type === "manager") return { resident: true, staff: staffRoles.filter((role) => role !== "ESTATE_MANAGER") };
  if (workspace?.type === "security") return { resident: false, staff: ["GUARD" as StaffRole] };
  return { resident: false, staff: [] as StaffRole[] };
}

export function adminInvitationRequest(kind: "resident" | "staff", form: { email: string; unitId?: string; residencyType?: string; role?: string }, workspace: Workspace | null): { path: string; body: Record<string, string> } {
  const permissions = invitationPermissions(workspace);
  const email = form.email.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
  if (kind === "resident") {
    const unitId = form.unitId?.trim();
    if (!permissions.resident) throw new Error("You cannot invite residents from this workspace.");
    if (!unitId || !residencyTypes.some((item) => item === form.residencyType)) throw new Error("Choose a residency type and enter a unit ID.");
    return { path: "resident-invitations", body: { email, unitId, residencyType: form.residencyType! } };
  }
  if (!permissions.staff.some((item) => item === form.role)) throw new Error("Choose a staff role you can assign.");
  return { path: "staff-invitations", body: { email, role: form.role! } };
}

export function recipientAccess(details: InvitationDetails, account: { email: string } | null): "new" | "login" | "wrong-account" | "ready" {
  if (!details.existingUser) return "new";
  if (!account) return "login";
  return sameEmail(account.email, details.email) ? "ready" : "wrong-account";
}

export function relationshipFields(details: InvitationDetails): { label: string; value: string }[] {
  const fields = [{ label: "Invited email", value: details.email }, { label: "Estate", value: details.estate.name }];
  if (details.estate.organization?.name) fields.push({ label: "Organization", value: details.estate.organization.name });
  if (details.type === "RESIDENT") fields.push(
    { label: "Unit", value: details.unit?.name || details.unit?.code || "Unavailable" },
    { label: "Residency", value: (details.residencyType || "RESIDENT").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()) },
  );
  else fields.push({ label: "Staff role", value: (details.role || "STAFF").toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) });
  return fields;
}

export function acceptanceBody(details: InvitationDetails, values?: { firstName: string; lastName: string; password: string }) {
  if (details.existingUser) return {};
  if (!values) throw new Error("Enter your name and password.");
  const firstName = values.firstName.trim();
  const lastName = values.lastName.trim();
  if (!firstName || !lastName || firstName.length > 100 || lastName.length > 100) throw new Error("Enter first and last names of up to 100 characters each.");
  if (values.password.length < 12 || values.password.length > 128) throw new Error("Use a password between 12 and 128 characters.");
  return { firstName, lastName, password: values.password };
}

export function sameEmail(a: string, b: string) { return a.trim().toLowerCase() === b.trim().toLowerCase(); }
export function invitationPath(token: string) { return `/onboarding/invitations/${encodeURIComponent(token)}`; }
export const pendingInvitationKey = "estateos.pendingInvitation";
export function safeLoginNext(next: string | null) { return next && /^\/onboarding\/invitations\/[A-Za-z0-9_-]+$/.test(next) ? next : "/overview"; }
