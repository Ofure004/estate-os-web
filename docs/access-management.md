# Access Management integration

The existing `/overview`, `/visitors`, `/gate`, and `/access` routes are retained.
`/login`, `/visitors/new`, and `/visitors/[invitationId]` complete the access workflow.

## Backend alignment

The implementation was checked against the sibling `estate-os-backend` source.
Invitation list/detail/create/cancel/pass APIs are resident-only. Gate verify/check-in/
check-out APIs require a guard or supervisor assignment. Managers see on-site and
activity data; there is no staff invitation list in the current backend.

Two backend additions were applied to support the integration:

- `GET /auth/me` returns identity plus `memberships`, `residencies`, and
  `staffAssignments`, including the related organization, estate, and unit scope.
  Explicit Prisma selects exclude password hashes and unrelated users.
- `GET /estates/:estateId/gates` returns `{ id, name, code, status }[]` for the
  authorized estate. The endpoint and service use the existing authorization policy.

The original patch is preserved in `backend-access-integration.patch` for review and
for other backend checkouts. It has already been applied to the local sibling repo.
No schema migration is required. Backend authorization remains authoritative.

The context adapter rejects an identity-only response instead of inventing permissions.
Relationships retain their lifecycle fields and scope; URLs may select only a workspace
that exists in the authenticated context. Organization pages remain deferred.

## Transport and state

`/api/backend/[...path]` allowlists supported methods and paths. It forwards the session
JWT server-side, disables caching, checks the Origin on writes, and avoids redirects
when contacting the configured backend. Login sends only a success result to the
browser and sets an HTTP-only, same-site cookie using the backend expiry. API 401
responses clear the cookie and display a sign-in link. Sign-out clears it and returns
to login. There is no invented token refresh flow.

Identity/workspaces load on the server. TanStack Query owns invitations, passes, gate
lists, presence, and activity. Keys include user and estate. Workspace changes remount
forms and gate verification state; login navigation reloads server context. URL selection
persists the active workspace through navigation and reload without a global user role.

Create/cancel invalidate the invitation prefix, including detail/pass. Gate actions
invalidate access and invitation queries. On-site/activity refresh every 15 seconds
while visible; passes refresh every 30 seconds. Mutations never auto-retry.

## Business behavior

- The invitation form submits without `hostResidencyId` initially. Only
  `HOST_RESIDENCY_REQUIRED` reveals a same-estate active unit selector.
- Date inputs use the device timezone and become ISO timestamps at submission.
  Display formatting never changes API values or derives a separate lifecycle.
- Pass QR codes encode the opaque `token`, locally, without a third-party QR service.
  Manual sharing uses the human-readable `code`.
- Verification displays visitor and host information. Only a second explicit action
  calls check-in; the backend revalidates it.
- Checkout is independent of verification. Expired/cancelled/revoked passes may still
  close an open visit. The on-site screen links operators to Live Gate for departure.
- HTTP 200 with `valid: false` or `success: false` is a business failure, never a success.
- Presence comes from `/access/onsite`. Activity is paginated and immutable.

## Validation and remaining limits

Frontend tests cover workspace scope/timing, transport allowlisting, cookie privacy,
cross-origin writes, API error normalization, and relationship parsing. Frontend lint and typecheck passed, as did 14 tests. The production build passed with
`npm run build -- --webpack` inside the sandbox; the default Turbopack build stalled.

Backend lint and TypeScript checks passed after the contract additions. The backend
Vitest suites require writing a cache in that repository; the sandbox blocked that and
the elevated test run was declined. The existing auth HTTP test was updated for the
expanded context response, but its execution remains outstanding.

No live database-backed user journey or browser visual review has been performed.
Camera QR capture and session refresh are outside this implementation; hardware scanner
input and manual pass codes are supported.
