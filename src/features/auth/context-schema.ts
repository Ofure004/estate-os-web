import { z } from "zod";
const id = z.string().min(1);
const timed = { status: z.string(), startedAt: z.string().nullable().default(null), endedAt: z.string().nullable().default(null) };
const estate = z.object({ id, name: z.string(), organizationId: z.string().default("") });
export const identitySchema = z.object({ id, email: z.email(), firstName: z.string().nullable().default(null), lastName: z.string().nullable().default(null), phone: z.string().nullable().default(null) });
export const contextSchema = identitySchema.extend({
  residencies: z.array(z.object({ id, ...timed, unit: z.object({ id, name: z.string(), code: z.string(), estate }) })),
  staffAssignments: z.array(z.object({ id, ...timed, role: z.enum(["GUARD", "SECURITY_SUPERVISOR", "ESTATE_MANAGER", "FACILITY_MANAGER"]), estate })),
  memberships: z.array(z.object({ id, status: z.string(), role: z.enum(["OWNER", "ADMIN", "MEMBER"]), organization: z.object({ id, name: z.string() }) })),
});
