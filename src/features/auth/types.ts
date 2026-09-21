/** Identity returned by the existing NestJS GET /auth/me endpoint. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
}

interface TimedRelationship {
  status: string;
  startedAt: string | null;
  endedAt: string | null;
}

export interface EstateScope {
  id: string;
  name: string;
  organizationId: string;
}

/** Presentation input for the future backend context adapter, NOT an API DTO. */
export interface WorkspaceRelationships {
  residencies: (TimedRelationship & {
    id: string;
    unit: { id: string; name: string; estate: EstateScope };
  })[];
  staffAssignments: (TimedRelationship & {
    id: string;
    role: "GUARD" | "SECURITY_SUPERVISOR" | "ESTATE_MANAGER" | "FACILITY_MANAGER";
    estate: EstateScope;
  })[];
  organizationMemberships: {
    id: string;
    status: string;
    role: "OWNER" | "ADMIN" | "MEMBER";
    organization: { id: string; name: string };
  }[];
}

interface WorkspaceBase {
  id: string;
  name: string;
  organizationId: string;
  label: string;
}

export type Workspace = WorkspaceBase & (
  | { type: "resident"; role: "RESIDENT"; estateId: string; residencyId: string; unitId: string }
  | { type: "guard"; role: "GUARD"; estateId: string; staffAssignmentId: string }
  | { type: "security"; role: "SECURITY_SUPERVISOR"; estateId: string; staffAssignmentId: string }
  | { type: "manager"; role: "ESTATE_MANAGER"; estateId: string; staffAssignmentId: string }
  | { type: "organization"; role: "OWNER" | "ADMIN" | "MEMBER"; organizationMembershipId: string }
);

export interface AuthenticatedContext {
  user: AuthenticatedUser;
  relationships: WorkspaceRelationships;
}
