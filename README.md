# EstateOS Web

Access management for residents, guards, security supervisors, and estate managers.
Built with Next.js, React, TanStack Query, and the existing EstateOS UI shell.

## Run locally

1. Start `estate-os-backend` with its database and JWT configuration on port 3000.
2. Create `.env.local` in this repository:

   ```dotenv
   ESTATEOS_API_URL=http://localhost:3000
   ```

3. Run `npm install` and `npm run dev -- --port 3001`.
4. Open `http://localhost:3001/login` and use an existing backend account.

The frontend and backend must use different ports. `ESTATEOS_API_URL` is server-only;
requests use a same-origin proxy and the JWT stays in an HTTP-only session cookie.
Production requires HTTPS. Sessions expire with the backend's `expiresIn`; the current
backend provides no refresh endpoint, so users sign in again after expiry.

Without an API URL, development retains the labeled shell preview. It has no simulated
access data and cannot perform access operations. Production never uses preview accounts.

## Available workflows

- Resident: invitations, create invitation, detail, QR/manual pass, cancel invitation.
- Guard/supervisor: choose a gate, verify a code or scanned credential, explicitly confirm
  check-in, and record departure independently of pass entry validity.
- Guard/supervisor/manager: current on-site visitors and paginated access activity.
- Workspace selection uses `/auth/me` relationships; one workspace opens automatically.

A connected QR scanner can type a token into the credential field. Camera scanning is
not included. QR images contain only the backend token and are generated locally.

See [integration notes](docs/access-management.md) for contracts and validation.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```
