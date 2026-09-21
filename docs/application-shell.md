# EstateOS application shell

> Historical shell notes. Access pages and authentication are now implemented; see
> [the current integration notes](access-management.md) for setup and backend contracts.

## Current scope

The four routes (`/overview`, `/visitors`, `/gate`, `/access`) share the dashboard
layout. They contain placeholders only. The sidebar collapses on desktop and uses
a keyboard-accessible modal drawer on small screens. The account card opens an
account summary. Theme tokens live in `src/app/globals.css`.

The existing shadcn setup uses React Aria. Its installed primitives are used for
the modal, account popover and workspace selector. Installing Base UI was not
approved during this change; the primitive migration remains outstanding.

## Local visual review

Run `npm run dev` and visit `/overview`. When `ESTATEOS_API_URL` is absent,
development uses one clearly labeled, isolated sample manager assignment for Palm
Grove Estate. There is no role toggle or simulated feature data. This preview is
disabled in production and whenever a backend URL is configured.

## Authentication integration boundary

The sibling `estate-os-backend` currently exposes:

- `POST /auth/login`: `{ accessToken, expiresIn, user }`.
- `GET /auth/me`: identity fields only (`id`, `email`, `firstName`, `lastName`, `phone`).

It does **not** yet expose the authenticated user's residency, staff assignment,
or organization membership context. The frontend therefore does not invent a
context endpoint or infer permissions from identity. `features/auth/server.ts`
validates `/auth/me` and intentionally returns `context-unavailable` until the
backend context endpoint can be connected. Production never uses the sample user.

Set `ESTATEOS_API_URL` to the backend origin. The later login implementation must
store its JWT in an HTTP-only cookie named `estateos_session` (or the name in
`ESTATEOS_SESSION_COOKIE`), with secure, same-site and expiry attributes. JWTs are
forwarded only by the server, with `cache: no-store`. Login UI, token refresh and
session creation are outside this shell milestone. Sign-out clears that cookie.

Once the backend exposes context, adapt its actual DTO into `AuthenticatedContext`
and return `{ status: "ready", context }` from the loader. `WorkspaceRelationships`
is an internal presentation model, **not** a proposed backend response contract.

## Workspace selection

- Active residencies produce a resident workspace per residency/unit.
- Active guard, supervisor and estate manager assignments produce scoped workspaces.
- Active organization memberships retain organization scope; they grant no estate
  access through the frontend. Facility management is outside this milestone.
- Start and end times use the same inclusive-start/exclusive-end rule as the backend.
- One workspace is selected automatically. Multiple workspaces show a chooser;
  the sidebar selector only exists when there is more than one valid workspace.
- The URL's `workspace` value is a relationship key, resolved against available
  workspaces. It cannot manufacture an estate or a role. This preserves selection
  on reload and navigation without storing a global role.
- Switching workspaces retains the current page when available, otherwise returns
  to Overview. Workspace content remounts so future local forms do not cross scopes.
- Future query keys must include the selected scope and authenticated user.

Navigation controls screen visibility, not API permissions. Staff visitor/gate
routes are placeholders; future operations must follow actual backend policies
(invitation operations require a residency, gate mutations require guard or
supervisor assignments). The backend remains authoritative.

## Validation

`npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

Workspace tests cover relationship timing/status, multiple scopes, invalid or
revoked selections, organization isolation and resident navigation.
