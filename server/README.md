# RepairVantage API

Express serves Apollo GraphQL and Better Auth. Prisma owns the PostgreSQL schema and checked-in migrations.

## Local development

Run from the repository root with the Node version in [`.nvmrc`](../.nvmrc). Keep local values in an ignored `server/.env` or your shell environment.

```bash
npm --prefix server ci --include=dev
npm --prefix server run prisma:deploy
npm --prefix server run build
npm --prefix server run dev
```

The dev listener defaults to port 4000. The Vite client forwards `/graphql` and `/api/auth` to that listener. Open the browser at the exact `APP_ORIGIN`, which defaults to `http://localhost:5173` outside production.

| Setting | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection URL for the running server. Use the pooled endpoint and restricted role on Neon. Production enforces [verified TLS](../docs/DEPLOYMENT.md#target). |
| `DIRECT_DATABASE_URL` | Direct PostgreSQL connection URL for Prisma CLI database commands. For local development both variables can point to the same local database. Keep the production migration role off the web host. |
| `APP_ORIGIN` | Browser origin with no trailing slash. Production requires HTTPS. |
| `BETTER_AUTH_SECRET` | Random secret of at least 32 characters. Keep separate values per environment. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth client. Configure `APP_ORIGIN/api/auth/callback/google` as an authorized redirect URI. |
| `RESEND_API_KEY`, `AUTH_EMAIL_FROM` | Credentials and verified sender for sign-in codes. |
| `AUTH_OTP_DAILY_LIMIT` | Maximum code requests per UTC day. Defaults to 75. Set below the email provider's available send quota. |
| `PORT` | Local listener port, default 4000. |
| `TRUST_PROXY_HOPS` | Number of trusted reverse-proxy hops. Default 0. Match the verified ingress path before relying on IP-based rate limits. |

Each provider activates only when its credentials are complete. The public site can load before sign-in is configured. Production `/ready` returns `auth_setup_required` while both providers are disabled. Local HTTP tests inject an email sender and use a disposable PostgreSQL database.

## Checks

```bash
npm --prefix server run build
npm --prefix server test
TEST_DATABASE_URL="$RV_TEST_DATABASE_URL" npm --prefix server run test:integration
TEST_DATABASE_URL="$RV_TEST_DATABASE_URL" npm --prefix server run test:auth
```

Set `RV_TEST_DATABASE_URL` to a PostgreSQL database on loopback whose name ends in `_test`. Omit query parameters and URL fragments. Apply migrations there first with `DIRECT_DATABASE_URL="$RV_TEST_DATABASE_URL" npm --prefix server run prisma:deploy`. Both integration suites create test-only records. API tests exercise GraphQL policy with a verified-session context. Auth tests exercise the HTTP email-code flow with an injected sender.

## Release

Set `DIRECT_DATABASE_URL` to the intended direct connection and run `npm --prefix server run prisma:deploy` as a release step. Prisma 7 loads [`prisma.config.ts`](prisma.config.ts) for CLI commands. Client generation and builds run without database credentials. The start command requires a successful build and available schema. `GET /health` checks liveness. `GET /ready` checks the application and database before routing traffic. See the [release runbook](../docs/DEPLOYMENT.md) for the deployment target and smoke checks.

## Access policy

- GraphQL accepts JSON POST from the configured origin. A verified session is required for workspace operations.
- Project owners can create, update, delete, invite, remove members, and publish or unpublish Showcase links. Owners can list, create, edit, and permanently delete tasks. Task deletion cascades to related assignments, dependency edges, and calendar entries.
- Owners can archive and restore projects. Archived project content is read-only. Existing invitation acceptance, revocation, member removal, and unpublishing remain available.
- Invitations bind a single-use link to the recipient's verified email. Links expire after seven days. Reissuing an invite revokes the previous link. Removing a member also revokes pending links for their email.
- Members can read shared project fields and post private comments. Owner notes, budgets, tasks, invitation details, and the membership list remain private to the owner.
- A Showcase URL exposes its explicit title, summary, publication time, and current project status to anyone with the link. Showcase links are unlisted. Unpublishing revokes the link, and republishing creates a new one.
