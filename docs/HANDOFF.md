# RepairVantage handoff

## Current branch and release state

Continue on `dev/report-export-demo`, created from `7924fc2` on `dev/engineering-harness`. The first continuation commit is `61c3a5d` (`feat(demo): import legacy projects for verified accounts`). Production application code remains on the release recorded in the [roadmap](ROADMAP.md); no hosted migrations or deployment ran in this continuation.

The inherited development work includes archive/restore, confirmed deletion, task assignment, inventory shortfalls, schedule views, and USD expense/hour reports. These remain development features until reviewed and released. Do not infer deployment from a passing local suite.

## Proven behavior and current verification

The original CSV timeout reproduced with:

```sh
CI=1 npm --prefix client test -- --forbid-only tests/project-report.spec.ts --trace on --timeout 10000
```

The trace showed `csvText` receiving an undefined expense description. The intercepted GraphQL expense lacked `__typename`, so Apollo did not read its typed fragment fields. Correcting that fixture made both report tests pass. The regression now checks the rendered expense row and date before downloading. No download implementation change was required.

The real-API [report acceptance test](../client/tests/report.full-stack.spec.ts) signs in through the loopback OTP sink, persists two expenses, reloads, reconciles the USD total and CSV rows, verifies formula/quote escaping and print invocation, then deletes its disposable project. API tests cover schedule date ranges, task-only schedules, stale assignee privacy, owner isolation, and rejected expense writes.

The committed candidate `3e1dda5` passed `node scripts/coverage.mjs --minimum-lines=99` (exit 0): 46 Node tests and 64 Chromium tests, with 99.20% V8 source lines and 96.97% branches. Local report: `coverage/run-7Kq42N/report/`. Client lint/build and server build passed. The schedule/report API cases also passed their focused PostgreSQL run. The strict 100% line target remains open. The subsequent evidence commit changes documentation only.

## Demonstration data

The user authorized the original mock projects for their own OTP account. On 2026-11-13, a guarded, additive SQL insert through the Neon connector imported the same five fixtures and deterministic IDs as the [opt-in CLI](../server/scripts/seed-demo.cjs). Readback verified six owned projects: five labeled demonstration fixtures plus the pre-existing project; all six unpublished. No auth records were written. Account existence and verified-email status were checked before import. The CLI itself was tested locally, not run against hosted credentials.

The reusable CLI requires explicit `DEMO_DATABASE_URL`, previews by default, and needs `--apply` to insert. It preserves edits, rejects ownership mismatches, and writes no users, credentials, sessions, or verification records. Disposable PostgreSQL verified dry run, apply, rerun, rollback, and compatibility with the older hosted schema through the OTP migration. See [demo setup](DEMO.md). Historical 2023 dates are intentional; no tasks, inventory, expenses, or fabricated progress were added.

## Resume order

1. Inspect [draft PR #1](https://github.com/davidmagbee/RepairVantage/pull/1) into `dev/engineering-harness` and its hosted CI. Local candidate verification passed. The larger development-to-`main` release remains separate.
2. Inspect hosted CI before promoting any application code. Apply archive, inventory, and expense migrations in order only as part of an authorized release. Use the [deployment runbook](DEPLOYMENT.md).
3. Complete hosted Google consent, inbox delivery, and account-linking QA with real accounts. The loopback OTP sink proves only the local flow.
4. Next product slice: expose existing project start/end dates in owner editing so Schedule can be populated through the UI. Settle date/time and range validation first. Dependency editing, independent calendar events, resource conflicts, report filtering, and broader UX remain follow-ups.

## Manual QA

1. Sign in with the authorized demonstration email code. Verify five sample projects plus the existing project; open a sample and inspect status. Other accounts must not see these private projects. Hosted browser acceptance remains pending.
2. On an isolated development account, record USD expenses `12.34` and `0.66`; reload → total `13.00`. Download CSV → matching rows/total; test a description beginning `=`. Print → Save as PDF.
3. Archive/restore a disposable project; verify shared reads, revocation, denied writes, and restored editing. Cancel permanent deletion before confirming it on disposable data.
4. Assign a task to a verified member, verify only assigned-task editing, then revoke membership and retry. Check inventory shortfalls, Schedule dates, and report access as owner and unauthorized caller.

## Commit and staging groups

Already committed:

```sh
git add README.md server/README.md docs/ROADMAP.md docs/DEMO.md server/package.json server/scripts/seed-demo.cjs server/test/demo-seed.test.cjs
git commit -m 'feat(demo): import legacy projects for verified accounts'
```

Report and API acceptance group:

```sh
git add client/tests/project-report.spec.ts client/tests/report.full-stack.spec.ts client/README.md server/test/schedule.test.cjs server/test/reporting.test.cjs docs/HANDOFF.md
git commit -m 'test(reports): verify persisted exports and schedule boundaries'
```

## PR body

### Change

Add an opt-in, private legacy-project importer for existing verified accounts. Repair the report mock's Apollo fragment discriminator and verify persisted report exports through the real OTP/API/PostgreSQL workflow. Extend schedule privacy/range and expense-denial acceptance.

### Verification

Before: report CSV test timed out; the browser trace identified undefined fragment fields. After: focused report tests and real-API export flow pass. Candidate `3e1dda5` passed 46 Node and 64 Chromium tests with 99.20% source lines and 96.97% branches. Independent `dev-review` inspected the actual diff and new files; no actionable defects established. Hosted sign-in and browser demo acceptance remain manual.

### Documentation

- [x] Completed the documentation checkpoint for this continuation.

Updated README, server/client guidance, roadmap exception, demo instructions, and this handoff. Reviewed implementation/glossary/domain rules and deployment/engineering runbooks: no domain, schema, release, or deployment procedure changed. Corrected client deletion QA wording to match its confirmation dialog.

### Release and data impact

No schema or authentication changes. Demo importer is never automatic. Five explicitly authorized private fixtures were inserted into the owner's hosted account; existing records preserved. Application deployment remains unchanged. Door: reversible code/tooling; inserted projects can be managed through owner UI. Blast radius: opt-in target account.

### Delta since previous push

Documentation-only follow-up records the completed `3e1dda5` coverage run and draft PR #1. No behavior, schema, or release change since the initial push. Inherits development features from `7924fc2` without releasing them to production.
