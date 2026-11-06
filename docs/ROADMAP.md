# RepairVantage roadmap

The [original Cursor plan](../.cursorrules) supplies the feature inventory. The [implementation guide](IMPLEMENTATION.md) maps it to the current stack and defines acceptance checks.

**Decision** · Use owner-entered repair projects for the live portfolio. Keep fixtures and test accounts in isolated development and test environments.

## Where we are

**Live foundation** · The public landing, verified-session workspace, and Prisma 7 PostgreSQL runtime are deployed. Production verifies database certificates and hostnames. [Release `2ce81ed`](https://vercel.com/davidmagbees-projects/repairvantage/G2fZ2Lb8nWYh11B9CxnpfhzrKP6g) · [Deployment runbook](DEPLOYMENT.md)

**Phase 1 is in progress** · Owners can create projects, open details from anywhere on a card, and edit name, description, status, and priority. Owners can manage invitations and membership and publish an unlisted Showcase. Invited members can read shared details and comment. Signed-out Showcase visitors with the link can read the published title, summary, and current status. [Project list](../client/src/pages/ProjectList.tsx) · [Details](../client/src/pages/ProjectDetails.tsx) · [Browser test](../client/tests/projects.full-stack.spec.ts)

**Next** · Build owner archive and restore. Keep archived projects read-only while preserving existing sharing and the owner's ability to revoke access. [Archive acceptance criteria](IMPLEMENTATION.md#project-lifecycle)

**Hosted sign-in QA** · Readiness passed and provider discovery reports Google and email codes enabled. Google consent and inbox delivery still need real-account checks. [Readiness](https://repairvantage.davidmagbee.com/ready) · [Providers](https://repairvantage.davidmagbee.com/api/auth/providers) · [Release QA](DEPLOYMENT.md#release-qa)

**Release coverage** · The local suite for `2ce81ed` measured 99.58% V8 lines and 97.65% branches. The 99% CI floor passed locally. The strict 100% line target remains open. [Coverage commands](ENGINEERING.md#application-coverage)

## Delivery order

| Phase | Scope | Exit |
| --- | --- | --- |
| 1. Project lifecycle · Current | Core editing and sharing are live. Archive and restore are next. | Verify archived writes are denied, existing sharing stays readable, and restoring reopens edits. |
| 2. Tasks · Planned | Expose task read and create in the project UI, then add editing and completion. Add assignment and an accessible board after the status rules settle. | Task changes persist and stay within the intended project. Define whether assignment grants access. |
| 3. Parts and tools · Planned | Add owner-scoped catalogs and project or task assignments. | Define ownership and quantity semantics. Prevent cross-owner links and conflicting allocations. |
| 4. Dependencies and scheduling · Planned | Add prerequisite rules, then calendar and Gantt views over project and task dates. | Reject invalid edges and cycles. Agree on time zones, all-day events, and which dates drive the timeline. |
| 5. Reporting and export · Planned | Add search, cost and time summaries, CSV, then PDF. | Reconcile totals and export rows with the same authorized filtered view. Define cost, currency, rounding, and time inputs first. |

**Every slice** · Test and refine the workflow, update its documentation, and record release evidence. Work toward 100% line coverage across executable application code and report branch coverage alongside it. [Engineering runbook](ENGINEERING.md) · [Current CI](../.github/workflows/verify.yml)

**Open decisions** · Permanent deletion. Task transitions, assignment, and viewer access. Inventory and schedule semantics. Report calculations and export rules. Record each decision before starting its first dependent slice. [Implementation guide](IMPLEMENTATION.md)
