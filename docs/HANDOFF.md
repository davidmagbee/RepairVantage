# RepairVantage handoff

## Current release · 2026-11-13

Production source: [`935418c7916aea7e9f9405394d4e6f9af02d968c`](https://github.com/davidmagbee/RepairVantage/commit/935418c7916aea7e9f9405394d4e6f9af02d968c), merged through [PR #2](https://github.com/davidmagbee/RepairVantage/pull/2). Its source tree matches tested candidate `5c03396`; [CI run `43481430708`](https://github.com/davidmagbee/RepairVantage/actions/runs/43481430708) passed. Deployment [`dpl_BovbvZrLoDipVbNVqmrLo7ouBj2A`](https://vercel.com/davidmagbees-projects/repairvantage/BovbvZrLoDipVbNVqmrLo7ouBj2A) is promoted at [RepairVantage](https://repairvantage.davidmagbee.com). [Release evidence](DEPLOYMENT.md#release-2026-11-13).

Archive/restore, confirmed deletion, tasks and member assignment, owner inventory and stock shortfalls, schedule views, UTC project-date editing, and USD expense/hour reports with CSV/printing are deployed. All seven checked-in migrations are applied. The pending archive, inventory, and expense migrations ran through the direct `repairvantage_owner` connection with `sslmode=verify-full`; runtime expense DML grants and owner default privileges were verified. Once projects are archived, rollback must use an archive-aware application.

## Verification and limits

Local acceptance passed 47 Node and 67 Chromium tests, with 99.07% V8 source lines and 96.85% branches (`coverage/run-YdsYSR/report/`, gate exit 0). Client lint/build and server build passed. Independent review found no actionable defects. The strict 100% line target remains open.

Release smoke checks returned HTTP 200 for canonical `/`, `/health`, `/ready`, `/api/auth/providers`, and `/projects/schedule`. The canonical HTML asset `index-DXf-RjAI.js` matches the package. Signed-out GraphQL returned `UNAUTHENTICATED` without private data. A protected browser route redirected to sign-in with provider buttons visible. A release-time Vercel error-log query covering the preceding 15 minutes returned no matching entries; it does not prove zero errors.

**Unverified:** production OTP delivery/sign-in, Google consent, account linking, and authenticated feature walkthroughs. Local OTP/API/PostgreSQL acceptance and signed-out hosted smoke checks do not establish those outcomes.

The date editor preserves untouched endpoint seconds and lets owners clear endpoints. API create/date patches reject reversed ranges using effective stored plus changed values under the project lock. Members and archived projects cannot edit. The focused concurrency case accepted exactly one of two opposing endpoint patches and rejected the other, leaving an ordered range.

The persisted-report browser test signs in through the loopback OTP sink, records expenses, reloads, reconciles totals and CSV rows, checks formula/quote escaping and print invocation, then deletes its disposable project. The earlier mocked CSV timeout was a fixture defect: an expense lacked `__typename`, preventing Apollo from reading fragment fields. The fixture regression now checks the rendered row/date before export; no download implementation change was needed.

## Demonstration data

The user authorized the original mock projects for their own OTP account. On 2026-11-13, a guarded additive Neon SQL insert imported the same five fixtures and deterministic IDs as the [opt-in CLI](../server/scripts/seed-demo.cjs). Readback verified six owned projects: five labeled demonstration fixtures plus the pre-existing project; all six unpublished. Existing verified-account status was checked, and no authentication records were written. Hosted browser acceptance remains pending. No private account address is recorded here.

The CLI requires explicit `DEMO_DATABASE_URL`, previews by default, and needs `--apply` to insert. It preserves edits, rejects ownership mismatches, and writes no users, credentials, sessions, or verification records. Disposable PostgreSQL verified dry run, apply, rerun, rollback, and compatibility with the earlier hosted schema through the OTP migration. The CLI was not run against hosted credentials. [Demo setup](DEMO.md). Historical 2023 dates are intentional; no tasks, inventory, expenses, or fabricated progress were added.

## Resume order

1. Inspect repository branch, HEAD, and dirty state against the promoted source before starting a new feature branch. The larger release is complete; do not reapply its migrations or redeploy merely to reconcile old handoffs.
2. Complete authenticated production QA below. Use real accounts for provider checks and disposable projects for destructive workflow checks.
3. Define the first task-dependency edge and completion/blocking semantics before implementing cycle-safe writes. Independent calendar events, resource conflicts, report filtering, and broader UX remain follow-ups. Use the [roadmap](ROADMAP.md) and [implementation guide](IMPLEMENTATION.md).

## Manual QA

1. Complete emailed OTP sign-in and Google consent; verify logout. Test both providers with the same verified address before claiming account linking. Confirm demonstration fixtures are visible only to their owner.
2. Owner → Edit dates → save UTC range → reload → Schedule calendar/timeline. Clear an endpoint; reject reversed dates; retry a failed save. Member/archived views must show dates without controls.
3. On a disposable project, record USD expenses `12.34` and `0.66`; reload → total `13.00`. Download CSV → matching rows/total; test a description beginning `=`. Print → Save as PDF.
4. Archive/restore a disposable project; verify shared reads, revocation, denied writes, and restored editing. Cancel permanent deletion before confirming it on disposable data.
5. Assign a task to a verified member, verify assigned-task-only editing, then revoke membership and retry. Check owner-only inventory shortfalls, schedule views, and report access with an unauthorized caller.
6. Publish a disposable Showcase; verify only its public fields signed out. Unpublish and confirm the URL stops resolving.

## Documentation handoff

Suggested semantic commit: `docs(release): record promoted workspace release and QA limits`.

```sh
git add README.md docs/ROADMAP.md docs/HANDOFF.md docs/DEPLOYMENT.md docs/IMPLEMENTATION.md server/README.md
```

PR body delta after release:

- **Change:** record promoted source/deployment and deployed archive, tasks, inventory, schedule/date editing, and reports; replace development-only status with release state.
- **Verification:** seven applied migrations; verified runtime expense privileges; canonical route/asset checks; signed-out denial and browser sign-in redirect; passing linked CI and local acceptance. Production authenticated QA remains open.
- **Documentation:** reconcile root/server READMEs, roadmap, implementation guide, deployment runbook, and this handoff. Preserve pending dependency/event/conflict/report-filter/UX work.
- **Release/data impact:** documentation only; no further migration, application deployment, or data mutation. Preserve archive-aware rollback policy.
