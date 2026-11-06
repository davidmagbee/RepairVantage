# RepairVantage handoff

## Branch state

The development branch adds reversible archive, confirmed permanent deletion, task CRUD and drag-and-drop status, assignment to verified members, private inventory and stock shortfalls, an owner schedule, and USD expense and time reports. Authentication keeps Better Auth verified cookie sessions. Production remains on the release recorded in the [roadmap](ROADMAP.md).

## Verification and next action

The combined run passed all 44 Node tests and 62 of 63 Chromium tests. The report expense saves and renders, but the CSV download test times out waiting for the browser download event. The full coverage report did not generate. Reproduce that test first, then run the [coverage command](ENGINEERING.md#application-coverage) against migrated disposable PostgreSQL. The core checkpoint reached 98.98% V8 lines, below the 99% CI floor and 100% target. Close remaining behavioral gaps before promoting. Apply archive, inventory, and expense migrations in order before a hosted release. [Deployment](DEPLOYMENT.md)

## Manual QA

### Resume order

1. Run `CI=1 npm --prefix client test -- --forbid-only tests/project-report.spec.ts --trace on --timeout 10000`. Inspect browser exceptions and the export anchor before changing download timing again. Both delayed Blob revocation and a data URL failed to produce a download event in the session. Verify the downloaded CSV and then the print action.
2. Run the full coverage gate on the exact candidate commit. Record the exit code, revision, and report path. A failed browser test aborts coverage generation. The 98.98% result belongs to the earlier core checkpoint.
3. Open or update the PR before relying on hosted CI. This workflow runs on PRs and pushes to `main`. The published development branch alone provides no CI result. [Verify workflow](../.github/workflows/verify.yml)

## Release walkthrough

1. Archive and restore a disposable project. Verify shared reads and access revocation, then try confirmed deletion on a disposable project.
2. Assign a task to a verified member. As that member, edit only the assigned task and its hours. Revoke membership and verify access ends.
3. Set stock to 2 and an active project requirement to 4. Verify the shortfall is 2 and disappears when the project is archived.
4. Set a task deadline. Check Schedule calendar and timeline, including assignee and required tools.
5. Record a USD expense and task hours. Reconcile on-screen and CSV totals. Use the browser print dialog to save a PDF.

Project start and end dates currently enter through the API. Independent calendar events, dependency editing, resource conflict enforcement, report search and filtering, and a broader performance and UX pass remain follow-ups. Complete hosted Google consent and real inbox delivery before closing release QA.

## PR body

### Change

Add the project lifecycle, assigned tasks, inventory forecasting, calendar and timeline views, and project expense and hour reporting.

### Verification

44 Node and 62 Chromium tests passed. The CSV download check timed out. The earlier core checkpoint was below the 99% gate. Retest before release.

### Documentation

README, roadmap, implementation, client and API guidance, and migration and release QA were reconciled across the commit range.

### Release and data impact

Three additive migrations. Existing sharing survives archive. Permanent deletion cascades related project work and sharing. Inventory and expense records are owner-scoped.

### Delta since previous push

Add archive and restore, task assignment, owner inventory and shortfalls, scheduling views, and USD reports to the published branch.

## Staging groups

Use `git diff-tree --no-commit-id --name-only -r <revision>` for the files in each group. To reconstruct an exact group from its parent, use `git show --format= --binary <revision> | git apply --index`.

- `0fe6755` · `feat(projects): archive and restore shared projects`
- `a86317a` · `feat(tasks): add owner task lifecycle and status board`
- `b6db34b` · `feat(projects): confirm permanent deletion from project details`
- `53b0840` · `feat(tasks): let members edit their assigned tasks`
- `3a16b8b` · `feat(inventory): track project requirements and stock shortfalls`
- `74e2c8a` · `feat(schedule): show project calendar and timeline`
- `fa68601` · `feat(reports): record USD expenses and task hours`
