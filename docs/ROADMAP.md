# RepairVantage roadmap

The [original Cursor plan](../.cursorrules) supplies the feature inventory. The [implementation guide](IMPLEMENTATION.md) maps it to the current stack and defines acceptance checks.

**Decision** · Use owner-entered repair projects for the live portfolio. Keep fixtures and test accounts in isolated development and test environments.

## Where we are

**Live foundation** · The public landing, verified-session workspace, and Prisma 7 PostgreSQL runtime are deployed. Production verifies database certificates and hostnames. [Release `2ce81ed`](https://vercel.com/davidmagbees-projects/repairvantage/G2fZ2Lb8nWYh11B9CxnpfhzrKP6g) · [Deployment runbook](DEPLOYMENT.md)

**Phase 1 is in progress** · Owners can create projects, open details from anywhere on a card, and edit name, description, status, and priority. Owners can manage invitations and membership and publish an unlisted Showcase. Invited members can read shared details and comment. Signed-out Showcase visitors with the link can read the published title, summary, and current status. [Project list](../client/src/pages/ProjectList.tsx) · [Details](../client/src/pages/ProjectDetails.tsx) · [Browser test](../client/tests/projects.full-stack.spec.ts)

**Development branch** · Owner archive and restore keep archived projects read-only while preserving existing sharing and the owner's ability to revoke access. [Archive acceptance criteria](IMPLEMENTATION.md#project-lifecycle)

**Hosted sign-in QA** · Readiness passed and provider discovery reports Google and email codes enabled. Google consent and inbox delivery still need real-account checks. [Readiness](https://repairvantage.davidmagbee.com/ready) · [Providers](https://repairvantage.davidmagbee.com/api/auth/providers) · [Release QA](DEPLOYMENT.md#release-qa)

**Release coverage** · The local suite for `2ce81ed` measured 99.58% V8 lines and 97.65% branches. The 99% CI floor passed locally. The strict 100% line target remains open. [Coverage commands](ENGINEERING.md#application-coverage)

## Delivery order

| Phase | Scope | Exit |
| --- | --- | --- |
| 1. Project lifecycle · In development | Core editing and sharing are live. Archive, restore, and confirmed permanent deletion are on the development branch. | Verify archived writes are denied, restore reopens edits, and deletion requires explicit confirmation. |
| 2. Tasks · In development | Owner CRUD, member assignment, and the status board are on the development branch. Drag cards or use the keyboard edit path. | Verify assignees can edit only their own tasks, membership removal ends access, and archived tasks reject writes. |
| 3. Parts and tools · In development | Owner-scoped parts and tools, project requirements, and stock shortfalls are on the development branch. | Verify isolated catalogs, quantity replacement, and demand changes when projects archive or finish. |
| 4. Dependencies and scheduling · Planned | Calendar and Gantt views show dated work, task assignees, and required tools. Add dependency rules as a separate slice. | Verify ranges and access. Reject invalid edges and cycles when dependencies ship. |
| 5. Reporting and export · Planned | Track actual USD costs and time, then export the authorized report as CSV and PDF. | Reconcile totals and export rows with the same authorized project view. |

**Every slice** · Test and refine the workflow, update its documentation, and record release evidence. Work toward 100% line coverage across executable application code and report branch coverage alongside it. [Engineering runbook](ENGINEERING.md) · [Current CI](../.github/workflows/verify.yml)

**Open decisions** · Inventory and schedule semantics beyond the agreed first slices. Report calculations and export rules. Record each decision before starting its first dependent slice. [Implementation guide](IMPLEMENTATION.md)
