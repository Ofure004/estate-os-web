import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

// Erase types with the project's existing compiler; no additional test dependency.
async function loadSource(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
}

const { deriveWorkspaces, resolveWorkspace } = await loadSource("../src/features/auth/workspaces.ts");
const { getNavigation } = await loadSource("../src/components/layout/navigation.ts");
const now = Date.parse("2026-09-16T12:00:00Z");
const estate = { id: "estate-a", name: "Estate A", organizationId: "org-a" };
const active = { status: "ACTIVE", startedAt: null, endedAt: null };
const staff = (id, role = "GUARD", overrides = {}) => ({ id, role, estate, ...active, ...overrides });
const residency = (id, overrides = {}) => ({ id, ...active, unit: { id: `unit-${id}`, name: id, estate }, ...overrides });
const context = (overrides = {}) => ({ residencies: [], staffAssignments: [], organizationMemberships: [], ...overrides });

test("one active workspace enters automatically; unknown selection cannot change its scope", () => {
  const workspaces = deriveWorkspaces(context({ staffAssignments: [staff("guard-a")] }), now);
  assert.equal(resolveWorkspace(workspaces, null)?.staffAssignmentId, "guard-a");
  assert.equal(resolveWorkspace(workspaces, "arbitrary-estate")?.estateId, "estate-a");
});

test("multiple scopes require a valid selection and preserve individual relationship IDs", () => {
  const workspaces = deriveWorkspaces(context({
    residencies: [residency("home-a"), residency("home-b")],
    staffAssignments: [staff("guard-b", "GUARD", { estate: { ...estate, id: "estate-b" } })],
  }), now);
  assert.equal(workspaces.length, 3);
  assert.equal(resolveWorkspace(workspaces, null), null);
  assert.equal(resolveWorkspace(workspaces, "staff:forged"), null);
  assert.equal(resolveWorkspace(workspaces, "staff:guard-b")?.estateId, "estate-b");
  assert.equal(resolveWorkspace(workspaces, "residency:home-b")?.residencyId, "home-b");
});

test("suspended, ended, future, and malformed timed relationships cannot become workspaces", () => {
  const invalid = [
    { status: "SUSPENDED" }, { status: "ENDED" }, { status: "PENDING" },
    { startedAt: "2026-09-17T00:00:00Z" }, { endedAt: new Date(now).toISOString() },
    { startedAt: "not-a-date" }, { endedAt: "not-a-date" },
  ];
  const workspaces = deriveWorkspaces(context({
    staffAssignments: invalid.map((value, index) => staff(`staff-${index}`, "GUARD", value)),
    residencies: invalid.map((value, index) => residency(`res-${index}`, value)),
  }), now);
  assert.deepEqual(workspaces, []);
});

test("start is inclusive and end is exclusive, matching backend authorization", () => {
  const workspaces = deriveWorkspaces(context({ staffAssignments: [
    staff("starting", "GUARD", { startedAt: new Date(now).toISOString() }),
    staff("ending", "GUARD", { endedAt: new Date(now).toISOString() }),
  ] }), now);
  assert.deepEqual(workspaces.map((item) => item.staffAssignmentId), ["starting"]);
});

test("assignments map to separate workspaces, without a global user role", () => {
  const workspaces = deriveWorkspaces(context({ staffAssignments: [
    staff("guard", "GUARD"), staff("supervisor", "SECURITY_SUPERVISOR"),
    staff("manager", "ESTATE_MANAGER"), staff("facility", "FACILITY_MANAGER"),
  ] }), now);
  assert.deepEqual(workspaces.map((item) => item.type), ["guard", "security", "manager"]);
});

test("organization membership never manufactures estate access", () => {
  const workspaces = deriveWorkspaces(context({ organizationMemberships: [
    { id: "owner", status: "ACTIVE", role: "OWNER", organization: { id: "org-a", name: "Organization A" } },
    { id: "suspended", status: "SUSPENDED", role: "ADMIN", organization: { id: "org-b", name: "Organization B" } },
  ] }), now);
  assert.equal(workspaces.length, 1);
  assert.equal(workspaces[0].estateId, undefined);
  assert.deepEqual(getNavigation(workspaces[0]).map((item) => item.id), ["overview"]);
});

test("resident navigation has no operational gate or estate-wide activity pages", () => {
  const [workspace] = deriveWorkspaces(context({ residencies: [residency("home")] }), now);
  assert.deepEqual(getNavigation(workspace).map((item) => item.id), ["overview", "visitors"]);
});

test("a revoked selection cannot resolve against refreshed relationships", () => {
  const workspaces = deriveWorkspaces(context({ staffAssignments: [staff("a"), staff("b")] }), now);
  assert.equal(resolveWorkspace(workspaces, "staff:revoked"), null);
  assert.equal(resolveWorkspace([], "staff:a"), null);
});

test("staff navigation matches the implemented backend permissions", () => {
  const [guard, manager] = deriveWorkspaces(context({ staffAssignments: [staff("guard"), staff("manager", "ESTATE_MANAGER")] }), now);
  assert.deepEqual(getNavigation(guard).map((item) => item.id), ["overview", "gate", "access"]);
  assert.deepEqual(getNavigation(manager).map((item) => item.id), ["overview", "access"]);
});
