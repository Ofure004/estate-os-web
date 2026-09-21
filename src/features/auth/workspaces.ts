import type { Workspace, WorkspaceRelationships } from "./types";

function isActive(relationship: { status: string; startedAt: string | null; endedAt: string | null }, now: number) {
  return relationship.status === "ACTIVE"
    && (relationship.startedAt === null || Date.parse(relationship.startedAt) <= now)
    && (relationship.endedAt === null || Date.parse(relationship.endedAt) > now);
}

/** Keep each relationship's scope; never combine a user's roles across estates. */
export function deriveWorkspaces(relationships: WorkspaceRelationships, now = Date.now()): Workspace[] {
  const workspaces: Workspace[] = [];
  for (const residency of relationships.residencies) {
    if (!isActive(residency, now)) continue;
    workspaces.push({
      id: `residency:${residency.id}`, type: "resident", role: "RESIDENT",
      label: `Resident · ${residency.unit.name}`, name: residency.unit.estate.name,
      organizationId: residency.unit.estate.organizationId,
      estateId: residency.unit.estate.id, residencyId: residency.id, unitId: residency.unit.id,
    });
  }
  for (const assignment of relationships.staffAssignments) {
    if (!isActive(assignment, now)) continue;
    const scope = {
      id: `staff:${assignment.id}`, name: assignment.estate.name,
      organizationId: assignment.estate.organizationId,
      estateId: assignment.estate.id, staffAssignmentId: assignment.id,
    };
    switch (assignment.role) {
      case "GUARD":
        workspaces.push({ ...scope, type: "guard", role: assignment.role, label: "Guard / Security" });
        break;
      case "SECURITY_SUPERVISOR":
        workspaces.push({ ...scope, type: "security", role: assignment.role, label: "Security" });
        break;
      case "ESTATE_MANAGER":
        workspaces.push({ ...scope, type: "manager", role: assignment.role, label: "Manager" });
        break;
      // Facility management is outside the current Access Management milestone.
    }
  }
  for (const membership of relationships.organizationMemberships) {
    if (membership.status !== "ACTIVE") continue;
    workspaces.push({
      id: `organization:${membership.id}`, type: "organization", role: membership.role,
      label: `Organization ${membership.role.toLowerCase()}`, name: membership.organization.name,
      organizationId: membership.organization.id, organizationMembershipId: membership.id,
    });
  }
  return workspaces;
}

export function resolveWorkspace(workspaces: Workspace[], selectedId: string | null): Workspace | null {
  if (workspaces.length === 1) return workspaces[0];
  return workspaces.find((workspace) => workspace.id === selectedId) ?? null;
}
