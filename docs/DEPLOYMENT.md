# Deployment

## Target

Vercel project `davidmagbees-projects/repairvantage` serves the Vite assets and the Express application at the same HTTPS origin. PostgreSQL runs in the dedicated `repairvantage` Neon project. Use the pooled connection as the Vercel runtime `DATABASE_URL` with the restricted application role. Use the direct owner connection only for migrations from a trusted release runner. Keep previews isolated from production data.

Both database URLs use the `public` schema. The production runtime enforces TLS certificate and hostname verification (`sslmode=verify-full`). RepairVantage uses channel binding when the server offers it, per the approved hosting policy. [Prisma PostgreSQL adapter](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql) · [node-postgres TLS](https://node-postgres.com/features/ssl)

## Configure sign-in

Set `APP_ORIGIN` to `https://repairvantage.davidmagbee.com`. Configure `BETTER_AUTH_SECRET`, `DATABASE_URL`, and `TRUST_PROXY_HOPS` per the [server runbook](../server/README.md). Configure each sign-in method in Vercel Production:

| Setting | Source |
| --- | --- |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Cloud OAuth Web client. Register `https://repairvantage.davidmagbee.com/api/auth/callback/google` exactly. [Google setup](https://developers.google.com/identity/protocols/oauth2/web-server) |
| `RESEND_API_KEY`, `AUTH_EMAIL_FROM` | A sending key scoped to the verified `auth.davidmagbee.com` domain. The sender is `login@auth.davidmagbee.com`. [Resend domain setup](https://resend.com/docs/dashboard/domains/introduction) |

Each provider activates independently when its settings are complete. `/api/auth/providers` reports availability. `/ready` reports `auth_setup_required` until at least one method is configured. Redeploy after changing Vercel environment variables, then verify each provider through the browser. Use a separate test database and provider configuration for hosted staging if one is needed. Keep credentials in the host's secret store.

Google sign-in requires a verified Gmail or Workspace mailbox. Other addresses can use a delivered email code. That distinction prevents a stale third-party Google claim from proving invite ownership. [Google mailbox authority](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token)

## Package and release

1. Verify the reviewed commit locally or in CI. Check the server and client runtime audit results. Apply migrations using `DIRECT_DATABASE_URL` set to the verified direct connection and `npm --prefix server run prisma:deploy`.
2. Run `node scripts/package-vercel.mjs <reviewed-commit>`. The command prints the generated directory. Inspect the source revision, bundled assets and server files. The packager reads the committed tree.
3. Link only the generated directory to the verified Vercel project. From that directory use `vercel project inspect --non-interactive` and confirm the owner, project, and Node runtime before deploying. The package includes the compiled Prisma client. The Vercel build does not generate the client or run migrations. [Vercel Express deployment](https://vercel.com/docs/frameworks/backend/express)
4. Stage the release with `vercel deploy --prod --skip-domain`, then inspect its build and routes. Promote the verified production deployment to the canonical origin. The configured `APP_ORIGIN` is required for authentication and GraphQL writes, so exercise those flows at the canonical URL. [Vercel promotion and rollback](https://vercel.com/docs/cli/deploying-from-cli)
5. Record the source revision, public URL, migration state, and verification. For a failed release with a previous working deployment, roll back the Vercel deployment and assess schema compatibility separately.

Apply the additive archive, owner inventory, and project expense migrations before staging builds that query those fields. Readiness checks require all three migrations. Once a project is archived, use an archive-aware deployment for rollback so the read-only policy continues to apply.

## Release 2026-11-13

Promoted source [`935418c7916aea7e9f9405394d4e6f9af02d968c`](https://github.com/davidmagbee/RepairVantage/commit/935418c7916aea7e9f9405394d4e6f9af02d968c) to [the canonical origin](https://repairvantage.davidmagbee.com). [Merged PR #2](https://github.com/davidmagbee/RepairVantage/pull/2) has the same source tree as tested candidate `5c03396`; [CI run `43481430708`](https://github.com/davidmagbee/RepairVantage/actions/runs/43481430708) passed. Deployment: [`dpl_BovbvZrLoDipVbNVqmrLo7ouBj2A`](https://vercel.com/davidmagbees-projects/repairvantage/BovbvZrLoDipVbNVqmrLo7ouBj2A).

All seven checked-in migrations are applied. The pending archive, owner-inventory, and expense migrations were applied using the direct `repairvantage_owner` connection with `sslmode=verify-full`. Runtime DML grants on `ProjectExpense` and the owner's default privileges were verified. Migration credentials remain outside the web runtime.

Release smoke checks returned HTTP 200 for `/`, `/health`, `/ready`, `/api/auth/providers`, and `/projects/schedule`. Canonical HTML references `index-DXf-RjAI.js`, matching the reviewed package. Signed-out GraphQL returned `UNAUTHENTICATED` without private data. A protected browser route redirected to sign-in; provider buttons were visible. A release-time Vercel error-log query covering the preceding 15 minutes returned no matching entries; this does not establish that no errors occurred.

Local acceptance passed 47 Node and 67 Chromium tests, with 99.07% V8 source lines and 96.85% branches. The owner confirmed the unchanged production OTP delivery/sign-in, Google consent, and account-linking flows. Authentication implementation, provider configuration code, dependency versions, and identity tables did not change from `2ce81ed` to `935418c`; this deployment did not change production provider settings. New authenticated feature walkthroughs remain owner QA. Archive-aware rollback remains required once projects are archived.

## Release QA

- Request `/`, `/health`, and `/ready`. Open and refresh a nested client route. Confirm GraphQL and auth paths receive API responses.
- In clean browser sessions, complete Google consent and an emailed sign-in code. Verify logout and that a signed-out browser cannot open the private workspace. Test both providers with the same verified address before claiming account linking.
- Create a real repair project and reopen it from the card padding. Save a status change, then save a different priority and reload. Verify both values persisted. Sign out and back in to check project access. Invite a second verified account and check that it can read and comment. Remove it and retry the private URL and old invite.
- Publish a Showcase title and summary. Open the link signed out and check the public fields. Unpublish it and verify the URL stops resolving.
- Archive a project with a published Showcase and a pending invite. Verify archived reads and access revocation still work, content changes are rejected, and restore reopens edits.
- Use a disposable project for permanent deletion QA. Cancel the prompt first, then confirm and check that the project and its Showcase link are gone.
