# RepairVantage roadmap

The [original Cursor plan](../.cursorrules) supplies the feature inventory. The [implementation guide](IMPLEMENTATION.md) maps it to the current stack and defines acceptance checks.

**Decision** · Use owner-entered repair projects for the live portfolio. Keep fixtures and test accounts in isolated development and test environments. The account owner explicitly authorized a narrow exception for importing the five original mock projects into their own demonstration account. The [opt-in importer](DEMO.md) preserves privacy, existing records, and authentication.

## Where we are

**Live release · 2026-11-13** · Source `935418c7916aea7e9f9405394d4e6f9af02d968c` is promoted to the canonical origin. Archive, tasks and assignment, owner inventory, schedule views, UTC project-date editing, and reports are deployed. All seven checked-in migrations are applied. Production verifies database certificates and hostnames. [Deployment](https://vercel.com/davidmagbees-projects/repairvantage/BovbvZrLoDipVbNVqmrLo7ouBj2A) · [Release evidence](DEPLOYMENT.md#release-2026-11-13)

**Project lifecycle is deployed** · Owners can create projects, open details from anywhere on a card, and edit name, description, status, priority, and UTC schedule dates. Owners can manage invitations and membership and publish an unlisted Showcase. Invited members can read shared details and comment. Signed-out Showcase visitors with the link can read the published title, summary, and current status. [Project list](../client/src/pages/ProjectList.tsx) · [Details](../client/src/pages/ProjectDetails.tsx) · [Browser test](../client/tests/projects.full-stack.spec.ts)

**Archive policy is deployed** · Owner archive and restore keep archived projects read-only while preserving existing sharing and the owner's ability to revoke access. Rollback must retain archive-aware authorization once records are archived. [Archive acceptance criteria](IMPLEMENTATION.md#project-lifecycle)

**Hosted QA** · Canonical routes, readiness, provider discovery, and signed-out GraphQL denial passed release smoke checks. A protected browser route redirected to sign-in with provider buttons visible. Production OTP delivery/sign-in, Google consent, account linking, and authenticated feature walkthroughs remain unverified. [Readiness](https://repairvantage.davidmagbee.com/ready) · [Providers](https://repairvantage.davidmagbee.com/api/auth/providers) · [Release QA](DEPLOYMENT.md#release-qa)

**Release verification** · The local acceptance run passed 47 Node and 67 Chromium tests, with 99.07% V8 source lines and 96.85% branches. [CI run `43481430708`](https://github.com/davidmagbee/RepairVantage/actions/runs/43481430708) passed for the tested tree `5c03396`; the promoted merge commit has the same tree. The strict 100% line target remains open. [Coverage commands](ENGINEERING.md#application-coverage) · [Current handoff](HANDOFF.md)

## Delivery order

| Phase | Scope | Exit |
| --- | --- | --- |
| 1. Project lifecycle · Deployed | Core editing, sharing, archive, restore, and confirmed permanent deletion are live. | Complete hosted QA for denied archived writes, restored editing, and deletion confirmation. |
| 2. Tasks · Deployed | Owner CRUD, member assignment, and the status board are live. Drag cards or use the keyboard edit path. | Complete hosted QA for assignee-only edits, membership revocation, and archived-write denial. |
| 3. Parts and tools · Deployed | Owner-scoped parts and tools, project requirements, and stock shortfalls are live. | Complete hosted QA for isolated catalogs, quantity replacement, and archived/completed demand changes. |
| 4. Scheduling · Deployed; dependencies pending | Owners can edit optional UTC project dates; calendar and Gantt views show dated work, task assignees, and required tools. Reversed date writes are rejected. | Complete hosted range/access QA. Define dependency semantics before implementing edges and cycle rejection; independent events and resource conflicts remain pending. |
| 5. Reporting and export · Deployed | Owner reports show actual USD expenses and task time. Download CSV or print to PDF. | Complete hosted totals/export reconciliation. Report filtering and broader UX remain follow-ups. |

**Every slice** · Test and refine the workflow, update its documentation, and record release evidence. Work toward 100% line coverage across executable application code and report branch coverage alongside it. [Engineering runbook](ENGINEERING.md) · [Current CI](../.github/workflows/verify.yml)

**Open decisions** · Inventory and schedule semantics beyond the agreed first slices. Report calculations and export rules. Record each decision before starting its first dependent slice. [Implementation guide](IMPLEMENTATION.md)
