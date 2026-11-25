# RepairVantage roadmap

The [original Cursor plan](../.cursorrules) supplies the feature inventory. The [implementation guide](IMPLEMENTATION.md) maps it to the current stack and defines acceptance checks.

**Decision** · Use owner-entered repair projects for the live portfolio. Keep fixtures and test accounts in isolated development and test environments. The account owner explicitly authorized a narrow exception for importing the five original mock projects into their own demonstration account. The [opt-in importer](DEMO.md) preserves privacy, existing records, and authentication.

## Where we are

**Current release · 2026-11-25** · PR #7 merged at `f1cc1d0`; tested source `ce17774` is live with neutral age screening, current-policy acknowledgment for existing/new accounts, durable authenticated under-age holds and the public privacy notice. All nine migrations and runtime privileges are verified. Production signed-out/age smoke checks passed; hosted OTP/Google and existing-session acknowledgment remain owner QA. [Release evidence](DEPLOYMENT.md#release-2026-11-25--account-eligibility).

**Current development · not deployed** · `dev/local-time-project-layout` starts from `main` at `51ec71b` after PR #8's release-record merge. It adds a browser time-zone preference (device detection, Eastern fallback, manual selection), consistent local display/editing, daylight-saving-safe Schedule ranges, and a wider responsive Project Details overview. UTC storage/export and access rules remain unchanged. Local acceptance passed: 52 Node + 92 Chromium tests, 99.02% lines / 96.93% branches, lint/build, independent source review and synthetic desktop/mobile inspection. Owner UI acceptance, hosted CI/review and release remain pending. The client build reports a large entry chunk; [evidence and tradeoff](HANDOFF.md#verification-checkpoint).

**Historical foundation release · 2026-11-13** · Source `935418c7916aea7e9f9405394d4e6f9af02d968c` was promoted to the canonical origin. Archive, tasks and assignment, owner inventory, schedule views, UTC project-date editing, and reports are deployed. All seven migrations then checked in were applied. Production verifies database certificates and hostnames. [Deployment](https://vercel.com/davidmagbees-projects/repairvantage/BovbvZrLoDipVbNVqmrLo7ouBj2A) · [Release evidence](DEPLOYMENT.md#release-2026-11-13)

**Project lifecycle is deployed** · Owners can create projects, open details from anywhere on a card, and edit name, description, status, priority, and UTC schedule dates. Owners can manage invitations and membership and publish an unlisted Showcase. Invited members can read shared details and comment. Signed-out Showcase visitors with the link can read the published title, summary, and current status. [Project list](../client/src/pages/ProjectList.tsx) · [Details](../client/src/pages/ProjectDetails.tsx) · [Browser test](../client/tests/projects.full-stack.spec.ts)

**Archive policy is deployed** · Owner archive and restore keep archived projects read-only while preserving existing sharing and the owner's ability to revoke access. Rollback must retain archive-aware authorization once records are archived. [Archive acceptance criteria](IMPLEMENTATION.md#project-lifecycle)

**Historical hosted QA · 2026-11-13** · Canonical routes, readiness, provider discovery, and signed-out GraphQL denial passed release smoke checks. A protected browser route redirected to sign-in with provider buttons visible. The owner confirmed existing production OTP delivery/sign-in, Google consent, and account linking after verification that this release changed no authentication implementation or provider settings. New authenticated feature walkthroughs remain owner QA. [Readiness](https://repairvantage.davidmagbee.com/ready) · [Providers](https://repairvantage.davidmagbee.com/api/auth/providers) · [Release QA](DEPLOYMENT.md#release-qa)

**Historical release verification · 2026-11-13** · The local acceptance run passed 47 Node and 67 Chromium tests, with 99.07% V8 source lines and 96.85% branches. [CI run `43481430708`](https://github.com/davidmagbee/RepairVantage/actions/runs/43481430708) passed for the tested tree `5c03396`; the promoted merge commit has the same tree. The strict 100% line target remains open. [Coverage commands](ENGINEERING.md#application-coverage) · [Current handoff](HANDOFF.md)

**UI restoration · Deployed 2026-11-24** · [PR #3](https://github.com/davidmagbee/RepairVantage/pull/3) merged at `5d46f84` on 2026-11-18. The UI restores the owner-supplied portfolio screenshot's dashboard, indigo workspace shell, colored summary cards, and project-card hierarchy. Metrics use real owner data; search/status filters preserve separate owned/shared lists. The restored UI first shipped from `472cd93`, including the scoped Effect patch; current production source is `ce17774`. [Design reference](UI-REFERENCE.md)

## Immediate direction

**Fact:** [PR #5](https://github.com/davidmagbee/RepairVantage/pull/5) consolidated integration into `main` at `ca8fe43` with a merge commit. Future feature PRs target `main`; prune retired branches only after current main CI and containment/worktree/PR checks. PR #6 merged the scoped Effect fix at `678d25e`; current main CI passed. The reviewed UI package `472cd93` was promoted, and five fully contained development branches were pruned after clean-worktree/PR/ancestry checks. [Fresh-chat handoff](HANDOFF.md).

**Next slice:** complete owner review and PR/CI for the timezone/Project Details branch before selecting another roadmap feature. Review desktop/mobile density, owner/member/archived controls, edited and untouched timestamps, repeated/skipped local times, and Schedule ranges across daylight-saving changes. Merge and production promotion remain separate steps; this slice needs no migration. [Acceptance](UI-REFERENCE.md#local-time-and-project-overview--current-development).

**Owner scope · 2026-11-24:** general audience, not child-directed; US-only launch; proposed minimum account age 18. The deployed account-eligibility feature implements screening, current-version acknowledgment for existing/new accounts and durable authenticated under-age holds. Public branding is RepairVantage; approved privacy/deletion contact is repairvantageadmin@gmail.com. A factual public notice is implemented. Eligibility migrations/code and the public notice are deployed; actual provider retention and a tested account-deletion workflow remain open. See [eligibility and expansion](ACCOUNT-ELIGIBILITY.md). DMCA-specific work is deferred per owner direction. The [readiness audit](PRIVACY-READINESS.md) found no implemented external fonts, replay, marketing sender or subscription checkout to repair; it is not legal clearance.

## Delivery order

| Phase | Scope | Exit |
| --- | --- | --- |
| 1. Project lifecycle · Deployed | Core editing, sharing, archive, restore, and confirmed permanent deletion are live. | Complete hosted QA for denied archived writes, restored editing, and deletion confirmation. |
| 2. Tasks · Deployed | Owner CRUD, member assignment, and the status board are live. Drag cards or use the keyboard edit path. | Complete hosted QA for assignee-only edits, membership revocation, and archived-write denial. |
| 3. Parts and tools · Deployed | Owner-scoped parts and tools, project requirements, and stock shortfalls are live. | Complete hosted QA for isolated catalogs, quantity replacement, and archived/completed demand changes. |
| 4. Scheduling · Deployed; local-time refinement in development | Deployed owners can edit optional UTC project dates; calendar and timeline show dated work, task assignees, and required tools. The current branch adds selected-zone editing/display and DST-safe civil-day ranges. Reversed date writes are rejected. | Verify/review/release the timezone refinement, then complete hosted range/access QA. Define dependency semantics before implementing edges and cycle rejection; independent events and resource conflicts remain pending. |
| 5. Reporting and export · Deployed | Owner reports show actual USD expenses and task time. Download CSV or print to PDF. | Complete hosted totals/export reconciliation. Report filtering and broader UX remain follow-ups. |

**Every slice** · Test and refine the workflow, update its documentation, and record release evidence. Work toward 100% line coverage across executable application code and report branch coverage alongside it. [Engineering runbook](ENGINEERING.md) · [Current CI](../.github/workflows/verify.yml)

**Open decisions** · Inventory and schedule semantics beyond the agreed first slices. Report calculations and export rules. Record each decision before starting its first dependent slice. [Implementation guide](IMPLEMENTATION.md)
