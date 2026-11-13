# RepairVantage handoff

## Project date continuation · 2026-11-13

PR #1 merged after its checks passed. This slice adds an owner UTC date editor and API range validation. Optional endpoints can be cleared; untouched endpoints preserve seconds. The API checks effective stored plus changed values under the existing project lock. Members and archived projects cannot edit. No migration or hosted deployment occurred.

Focused API test passed after reproducing a reversed-date create that previously persisted. Browser red reproduced the absent editor. Full implementation-tree acceptance passed: 47 Node tests, 67 Chromium tests, 99.07% V8 source lines and 96.85% branches (`coverage/run-yEZeaY/report/`, coverage gate exit 0). Client lint/build and server build passed. A subsequent focused concurrency case passed: opposing endpoint patches yield exactly one accepted write and one rejected range; final API read stays ordered. Independent review found no actionable defects. The committed candidate is rechecked before merge.

Semantic commit: `feat(schedule): edit and validate project UTC dates`. Staging: `git add README.md client/README.md client/src/components/ProjectDates.tsx client/src/pages/ProjectDetails.tsx client/src/graphql/queries.ts client/src/graphql/mutations.ts client/tests/project-dates.spec.ts client/tests/report.full-stack.spec.ts server/README.md server/src/graphql/resolvers/index.ts server/test/project-dates.test.cjs server/package.json docs/IMPLEMENTATION.md docs/ROADMAP.md docs/HANDOFF.md`.

Manual QA: owner → Edit dates → save UTC range → reload → Schedule calendar/timeline; clear an endpoint; reverse the range and verify rejection; retry a failed save; member/archived view shows dates without controls. Tests exercise owner and denied callers through GraphQL/PostgreSQL.

## Previous continuation and release state

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

1. PR #1 merged into `dev/engineering-harness` at `c8c9888` after CI passed. New date-editing work continues on `dev/report-export-demo`. The larger development-to-`main` release remains separate.
2. Inspect hosted CI before promoting any application code. Apply archive, inventory, and expense migrations in order only as part of an authorized release. Use the [deployment runbook](DEPLOYMENT.md).
3. Complete hosted Google consent, inbox delivery, and account-linking QA with real accounts. The loopback OTP sink proves only the local flow.
4. Project date editing is now implemented in the continuation below. Next product decision: define the first task-dependency edge and completion/blocking semantics before implementing cycle-safe writes. Independent calendar events, resource conflicts, report filtering, and broader UX remain follow-ups.

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

Owners can edit optional UTC project start/end dates from Project Details and see the saved project in Schedule. Blank endpoints clear dates; untouched endpoints preserve seconds. Members and archived projects show dates without editing controls. API creation/date patches reject reversed ranges and validate stored plus changed values under the project lock.

### Verification

Red: missing editor and reversed API create reproduced. Green: 47 Node + 67 Chromium tests; 99.07% source lines and 96.85% branches; full local gate exit 0. Real OTP/API/PostgreSQL acceptance saves dates, opens the project from Schedule, and reopens the persisted editor before report export. Focused tests cover clearing, cancel, retry, denied callers, archive/restore, legacy ranges, and concurrent conflicting endpoint writes. Client lint/build and server build pass; independent review found no actionable defects. Hosted date-editor walkthrough remains manual.

### Documentation

- [x] Documentation checkpoint completed.

Updated root/client/server READMEs, implementation guide, roadmap, and handoff. Reviewed glossary/domain conventions and engineering/deployment instructions; terminology, schema and release procedures stay unchanged. Corrected remaining deletion-confirmation wording in implementation guidance.

### Release and data impact

No migration or deployment. Existing optional date fields reused. API now rejects newly reversed ranges; unrelated edits retain historical reversed ranges until dates change. Owner/archive authorization retained. Door: reversible application change. Blast radius: project date writes.

### Delta since previous push

Adds UTC project-date authoring and stored-range validation after PR #1 merged at `c8c9888`. Earlier seed/report work remains unchanged. New conventional commit: `feat(schedule): edit and validate project UTC dates`.
