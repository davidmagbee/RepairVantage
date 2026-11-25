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
4. Stage the release with `vercel deploy --prod --skip-domain`, then inspect its build and routes. Promote the verified production deployment to the canonical origin. Promotion requests can return before alias propagation finishes: verify the canonical alias points to the intended deployment and its HTML loads the expected assets before running acceptance checks. The configured `APP_ORIGIN` is required for authentication and GraphQL writes, so exercise those flows at the canonical URL. [Vercel promotion and rollback](https://vercel.com/docs/cli/deploying-from-cli)
5. Record the source revision, public URL, migration state, and verification. For a failed release with a previous working deployment, roll back the Vercel deployment and assess schema compatibility separately.

Apply the additive archive, owner inventory, and project expense migrations before staging builds that query those fields. Readiness checks require all three migrations. Once a project is archived, use an archive-aware deployment for rollback so the read-only policy continues to apply.

## Release 2026-11-13

Promoted source [`935418c7916aea7e9f9405394d4e6f9af02d968c`](https://github.com/davidmagbee/RepairVantage/commit/935418c7916aea7e9f9405394d4e6f9af02d968c) to [the canonical origin](https://repairvantage.davidmagbee.com). [Merged PR #2](https://github.com/davidmagbee/RepairVantage/pull/2) has the same source tree as tested candidate `5c03396`; [CI run `43481430708`](https://github.com/davidmagbee/RepairVantage/actions/runs/43481430708) passed. Deployment: [`dpl_BovbvZrLoDipVbNVqmrLo7ouBj2A`](https://vercel.com/davidmagbees-projects/repairvantage/BovbvZrLoDipVbNVqmrLo7ouBj2A).

All seven checked-in migrations are applied. The pending archive, owner-inventory, and expense migrations were applied using the direct `repairvantage_owner` connection with `sslmode=verify-full`. Runtime DML grants on `ProjectExpense` and the owner's default privileges were verified. Migration credentials remain outside the web runtime.

Release smoke checks returned HTTP 200 for `/`, `/health`, `/ready`, `/api/auth/providers`, and `/projects/schedule`. Canonical HTML references `index-DXf-RjAI.js`, matching the reviewed package. Signed-out GraphQL returned `UNAUTHENTICATED` without private data. A protected browser route redirected to sign-in; provider buttons were visible. A release-time Vercel error-log query covering the preceding 15 minutes returned no matching entries; this does not establish that no errors occurred.

Local acceptance passed 47 Node and 67 Chromium tests, with 99.07% V8 source lines and 96.85% branches. The owner confirmed the unchanged production OTP delivery/sign-in, Google consent, and account-linking flows. Authentication implementation, provider configuration code, dependency versions, and identity tables did not change from `2ce81ed` to `935418c`; this deployment did not change production provider settings. New authenticated feature walkthroughs remain owner QA. Archive-aware rollback remains required once projects are archived.

## Source-state recheck · 2026-11-18

PR #3 merged the portfolio UI into `dev/engineering-harness` at `5d46f84`; no UI deployment was performed in this handoff task. Read-only provider inspection still resolved the canonical domain to `dpl_BovbvZrLoDipVbNVqmrLo7ouBj2A` and the public client loaded `index-DXf-RjAI.js`, matching the recorded `935418c` release. The Vercel project reported no Git connection, and repository Verify contains no deployment step. External automation was not comprehensively ruled out; recheck before the [main consolidation](BRANCH-CONSOLIDATION.md). Release the reviewed UI source separately using the package-and-release procedure; a branch merge does not apply hosted migrations or promote a deployment.

## Release 2026-11-24 · restored UI

Consolidation PR #5 merged at `ca8fe43`; dependency PR #6 merged at `678d25e`, with both PR checks and resulting main CI passing. The release packages reviewed source `472cd93ff4338721d39dc8de52fa0700d6b71252` (PR #6 head), whose tree is the main merge's tree. This includes the restored UI and scoped patched Effect dependency, with no auth-source/provider changes. Client/server runtime npm audits returned zero after the patch.

Staged production deployment [`dpl_8V69mRY95LqEm3pi4GmgEMt3DixZ`](https://vercel.com/davidmagbees-projects/repairvantage/8V69mRY95LqEm3pi4GmgEMt3DixZ) passed authenticated protected-deployment reads for readiness, provider discovery and the dashboard shell. It was then promoted to [the canonical origin](https://repairvantage.davidmagbee.com). Public checks returned 200 for `/`, `/ready`, provider discovery and `/projects/dashboard`; HTML matched `index-Lwc0KQGF.js` / `index-Ba_5MxwD.css`. Signed-out GraphQL denied `me` with `UNAUTHENTICATED` and no private data. Existing owner-confirmed authentication remains unchanged; no new hosted provider acceptance is claimed.

Fresh pre-release baseline: 48 Node + 71 Chromium tests, 99.03% lines / 96.82% branches (`coverage/run-YouhOV/report/`), lint/build and built-package desktop/mobile checks. Dependency patch additionally passed Prisma generation/build, unit tests, audit and current PR/main CI. UI captures used synthetic data; owner feature acceptance remains separate.

No production migration was run for this release; it uses the previously applied seven migrations. Previous deployment `dpl_BovbvZrLoDipVbNVqmrLo7ouBj2A` remains archive-aware. Vercel Git linkage remained absent at the execution recheck; source merges do not deploy automatically through the repository Verify workflow.

### Eligibility release gate

The separate account-eligibility feature requires migrations `20261124163000_account_eligibility` and `20261124170000_account_eligibility_restriction`, runtime acknowledgment-table privileges and User restriction-column access. Neither new migration was applied to production during the UI release. After eligibility is deployed, rollback to a build that ignores acknowledgments or holds is unsafe; preserve that boundary. Verify real OTP, Google consent/linking, existing-session acknowledgment, public privacy route, restriction denial and sign-out before calling the new auth workflow accepted. [Full criteria](ACCOUNT-ELIGIBILITY.md).

## Release 2026-11-25 · account eligibility

The owner approved local UI review and merged [PR #7](https://github.com/davidmagbee/RepairVantage/pull/7) at `f1cc1d024464d08b47230722983aec8810988633`. Its tree equals tested feature head `ce177748accf67be699672e72c1739b5d23e206e`; that exact reviewed tree was packaged for production. PR Verify and [merged-main Verify](https://github.com/davidmagbee/RepairVantage/actions/runs/45656586620) passed. Current client/server runtime npm audits returned zero vulnerabilities. Local feature acceptance remained 52 Node + 79 Chromium tests, 99.01% lines / 96.90% branches; those tests were not rerun merely for this release record.

Prisma applied `20261124163000_account_eligibility` and `20261124170000_account_eligibility_restriction` to the verified `repairvantage` production database, project `muddy-smoke-36782232`, branch `br-super-union-bcqtliyl`. Migration transport used the direct owner connection with `sslmode=verify-full`. All nine migrations are now applied. Runtime role `repairvantage_app` has acknowledgment SELECT/INSERT/UPDATE and restriction-column SELECT/UPDATE. These were checked explicitly; readiness alone was not used as proof of write permissions. No acceptance, hold or fixture account was backfilled.

Production deployment [`dpl_CjSsbytY3cPDrYS8yKQjZAgVJCze`](https://vercel.com/davidmagbees-projects/repairvantage/CjSsbytY3cPDrYS8yKQjZAgVJCze) was staged without domains. Protected-deployment checks passed readiness, eligibility status, privacy and dashboard deep-link shell. It was then promoted to [the canonical origin](https://repairvantage.davidmagbee.com). Alias assignment and public assets `index-C75HHS4e.js` / `index-CE3blD3a.css` were verified after propagation.

Production verification:

- Health/readiness/provider discovery returned 200; both configured providers remain available.
- Anonymous eligibility status returned the current 18+ policy. Browser inspection showed the age form and the published privacy notice with approved contact `repairvantageadmin@gmail.com`.
- Signed-out private GraphQL denied `me` with `UNAUTHENTICATED` and no private data.
- OTP initiation without eligibility returned 403 before any recipient was supplied. No code email was sent.
- A separate anonymous request context declaring 16 was rejected; an immediate adult retry with that rejection cookie was also rejected. A fresh anonymous adult declaration returned 204. These requests were separate from the owner's browser and created no account-level hold.
- Signed-out acknowledgment returned 401. New authenticated acknowledgment writes and Google/OTP sign-in/linking still require the owner's live walkthrough; historical acceptance of unchanged auth is not substituted for these new flows.
- A deployment-scoped error/fatal query over the preceding 15 minutes returned no matching groups. This is a bounded observation, not proof that no error ever occurred.

The new runtime enforces eligibility on existing sessions. **Old deployments `472cd93` / `dpl_8V69mRY95LqEm3pi4GmgEMt3DixZ` and earlier ignore those holds and are no longer safe rollback targets once live holds/acknowledgments exist.** Recover with an eligibility-aware, archive-aware build. The database migrations are additive; do not drop audit records or restriction state as a routine rollback.

## Release 2026-11-25 · local time, layout and favicon

The owner authorized deployment after merging [PR #9](https://github.com/davidmagbee/RepairVantage/pull/9). Exact merged source [`c970593327df66edd500f885b8c2b27be9f24435`](https://github.com/davidmagbee/RepairVantage/commit/c970593327df66edd500f885b8c2b27be9f24435) was packaged; it has the same tree `8aad51872330b6bc3ffa86aa120a14cf445808cb` as reviewed PR head `fe3b87d9b5ed8fefc1b2b652af43e8b8895973ce`. [PR-head Verify](https://github.com/davidmagbee/RepairVantage/actions/runs/45668078312) and [merged-main Verify](https://github.com/davidmagbee/RepairVantage/actions/runs/45668909913) passed; main completed at 17:53:41 UTC. Its logs confirm 52 Node + 92 Chromium tests with 99.02% lines / 96.93% branches. Fresh client/server runtime audits returned zero vulnerabilities.

This release adds selected-zone date editing/display, a DST-aware optional Schedule argument, the responsive Project Details overview and a local SVG favicon. No migrations, account/project mutations or auth/provider configuration changes were performed. All nine migrations had already been applied and privileges verified by the earlier eligibility release; no schema conversion or acceptance backfill was needed. Runtime auth/security bookkeeping was not audited for incidental writes.

Production deployment `dpl_B82wkdTojJibZQ5PW71Ev7AarjCh` was staged at [its protected deployment URL](https://repairvantage-gvesm5ttj-davidmagbees-projects.vercel.app). Readiness, provider discovery, nested Schedule HTML, and favicon checks passed before promotion. Following successful main CI, promotion was requested at 17:54:16 UTC (12:54:16 Eastern) on 2026-11-25. After alias propagation, [the canonical origin](https://repairvantage.davidmagbee.com) resolved to that ready deployment. Canonical HTML, `index-s5vrD5tl.js`, `index-CdgCCkDM.css` and `/favicon.svg` returned 200 and were byte-equal to the reviewed package. The 1,122-byte favicon SHA-256 is `ddd8d1b4d656750ba5401390600c29ad259ad02d20129bbae0c934a1b287032e`. Release identity is established by the reviewed archive/tree and byte checks.

Canonical verification:

- `/health` reported healthy; `/ready` reported ready. Provider discovery advertised Google and email OTP. Availability does not establish provider completion or account linking.
- Public `/privacy`, `/login` and `/projects/schedule` returned the new HTML shell. Browser inspection of `/login` showed Sign in, the privacy link, age-in-years form and Continue control, with `/favicon.svg` linked and no browser error logs.
- Eligibility status returned policy `adult-2026-11-24`, minimum age 18, with the anonymous context unscreened, unblocked and unacknowledged. Signed-out GraphQL `me` returned `UNAUTHENTICATED` with no private data.
- The favicon returned `image/svg+xml` with `nosniff` and the expected content-security policy. Canonical HTML/JS/CSS/favicon bytes matched the package.
- A deployment-scoped error/fatal log query over the preceding 15 minutes returned no matching groups. This is a bounded observation, not proof of no errors.

Automated release checks were anonymous/signed out. No OTP email was requested, Google consent initiated, age declaration/hold submitted, fixture account created or account/project mutation performed. Authenticated owner timezone/layout acceptance and the earlier eligibility release's hosted OTP/Google/linking/existing-session walkthrough remain outstanding. Synthetic captures and local/API tests do not substitute for those checks. The client build's large entry-chunk warning remains documented in [Engineering](ENGINEERING.md#time-zone-and-project-details-slice).

Previous eligibility deployment `dpl_CjSsbytY3cPDrYS8yKQjZAgVJCze` remains an eligibility-aware, archive-aware rollback target. Older UI-only deployments remain unsafe once holds/acknowledgments exist. No branch was pruned by this release.

## Release QA

- Request `/`, `/health`, and `/ready`. Open and refresh a nested client route. Confirm GraphQL and auth paths receive API responses.
- When authentication or provider settings change, use clean browser sessions to complete Google consent and an emailed sign-in code. Verify logout and signed-out workspace denial. Test both providers with the same verified address before claiming account linking. Existing unchanged flows are owner-confirmed for the 2026-11-13 release.
- Create a real repair project and reopen it from the card padding. Save a status change, then save a different priority and reload. Verify both values persisted. Sign out and back in to check project access. Invite a second verified account and check that it can read and comment. Remove it and retry the private URL and old invite.
- Publish a Showcase title and summary. Open the link signed out and check the public fields. Unpublish it and verify the URL stops resolving.
- Archive a project with a published Showcase and a pending invite. Verify archived reads and access revocation still work, content changes are rejected, and restore reopens edits.
- Use a disposable project for permanent deletion QA. Cancel the prompt first, then confirm and check that the project and its Showcase link are gone.
