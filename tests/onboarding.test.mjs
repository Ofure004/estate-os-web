import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/features/onboarding/model.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const model = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

const scope = (type, role) => ({ type, role, id: "scope", organizationId: "org", estateId: "estate" });
const resident = { type: "RESIDENT", email: "invite@example.com", existingUser: false, estate: { id: "estate", name: "Palm Grove" }, unit: { id: "unit", name: "Flat 4" }, residencyType: "TENANT", expiresAt: "2026-10-01T00:00:00Z" };

test("admin invitation forms send only relationship assignments allowed by the active workspace", () => {
  assert.deepEqual(model.adminInvitationRequest("resident", { email: " jane@example.com ", unitId: " unit-4 ", residencyType: "TENANT" }, scope("manager", "ESTATE_MANAGER")), { path: "resident-invitations", body: { email: "jane@example.com", unitId: "unit-4", residencyType: "TENANT" } });
  assert.deepEqual(model.adminInvitationRequest("staff", { email: "guard@example.com", role: "GUARD" }, scope("security", "SECURITY_SUPERVISOR")), { path: "staff-invitations", body: { email: "guard@example.com", role: "GUARD" } });
  assert.throws(() => model.adminInvitationRequest("resident", { email: "x@y.com", unitId: "u", residencyType: "OWNER" }, scope("security", "SECURITY_SUPERVISOR")));
  assert.throws(() => model.adminInvitationRequest("staff", { email: "x@y.com", role: "ESTATE_MANAGER" }, scope("manager", "ESTATE_MANAGER")));
  assert.throws(() => model.adminInvitationRequest("staff", { email: "x@y.com", role: "FACILITY_MANAGER" }, scope("security", "SECURITY_SUPERVISOR")));
  assert.equal(model.invitationPermissions(scope("organization", "OWNER")).staff.length, 4);
});

test("recipient branches on existingUser and blocks a wrong signed-in email", () => {
  assert.equal(model.recipientAccess(resident, null), "new");
  const existing = { ...resident, existingUser: true };
  assert.equal(model.recipientAccess(existing, null), "login");
  assert.equal(model.recipientAccess(existing, { email: "other@example.com" }), "wrong-account");
  assert.equal(model.recipientAccess(existing, { email: " INVITE@example.com " }), "ready");
  assert.equal(model.safeLoginNext(model.invitationPath("secret-token")), model.invitationPath("secret-token"));
  assert.equal(model.safeLoginNext("//evil.example"), "/overview");
});

test("acceptance payload owns credentials only; assigned relationship details remain read-only", () => {
  assert.deepEqual(model.relationshipFields(resident).map((field) => field.value), ["invite@example.com", "Palm Grove", "Flat 4", "Tenant"]);
  assert.deepEqual(model.relationshipFields({ ...resident, type: "STAFF", role: "SECURITY_SUPERVISOR" }).map((field) => field.value), ["invite@example.com", "Palm Grove", "Security Supervisor"]);
  const payload = model.acceptanceBody(resident, { firstName: " Jane ", lastName: " Doe ", password: "long-password-123" });
  assert.deepEqual(payload, { firstName: "Jane", lastName: "Doe", password: "long-password-123" });
  for (const key of ["email", "estate", "unit", "residencyType", "role", "organization"]) assert.equal(Object.hasOwn(payload, key), false);
  assert.deepEqual(model.acceptanceBody({ ...resident, existingUser: true }, undefined), {});
  assert.throws(() => model.acceptanceBody(resident, { firstName: " ", lastName: "Doe", password: "long-password-123" }));
  assert.throws(() => model.acceptanceBody(resident, { firstName: "Jane", lastName: "Doe", password: "short" }));
  assert.throws(() => model.acceptanceBody(resident, { firstName: "x".repeat(101), lastName: "Doe", password: "long-password-123" }));
});
