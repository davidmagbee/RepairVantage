# RepairVantage roadmap

**Decision** · Use owner-entered repair projects for the live portfolio. Keep fixtures and test accounts in isolated development and test environments.

## Current release

**Verified** · The landing page and readiness endpoint respond on the canonical origin. Provider discovery reports Google and email codes enabled. [Landing](https://repairvantage.davidmagbee.com/) · [Readiness](https://repairvantage.davidmagbee.com/ready) · [Providers](https://repairvantage.davidmagbee.com/api/auth/providers) · [Release checks](DEPLOYMENT.md)

**Implemented** · Owners can create and reopen projects, update status, manage invitations and membership, and publish or unpublish an unlisted Showcase. Invited members can read shared details and comment. A signed-out Showcase visitor with the link sees the published title and summary plus current status. PostgreSQL and browser tests exercise the private workflow locally. [GraphQL API](../server/src/graphql/schema/index.ts) · [Browser test](../client/tests/projects.full-stack.spec.ts)

**User report** · Sign-in and project UI use succeeded. The result for each live provider, including inbox delivery, is still unconfirmed.

## Delivery order

| Phase | Scope | Exit |
| --- | --- | --- |
| 1. Project lifecycle | Owner edits project name and description first. Later define lifecycle and archival behavior. | Save and clear descriptions. Verify reload, validation, and denied member or unrelated writes. Agree on archive and deletion effects before exposing controls. |
| 2. Tasks | Owner creates, lists, edits, and completes project tasks. Add assignment and an accessible board after the status rules settle. | Task changes persist and stay within the intended project. Define whether assignment grants access. |
| 3. Parts and tools | Add owner-scoped catalogs and project or task assignments. | Define ownership and quantity semantics. Prevent cross-owner links and conflicting allocations. |
| 4. Dependencies and scheduling | Add prerequisite rules, then calendar and Gantt views over project and task dates. | Reject invalid edges and cycles. Agree on time zones, all-day events, and which dates drive the timeline. |
| 5. Reporting and export | Add search, cost and time summaries, CSV, then PDF. | Reconcile totals and export rows with the same authorized filtered view. Define cost, currency, rounding, and time inputs first. |
| 6. Documentation and release | Update setup, API, usage, and portfolio evidence with each feature. | A fresh checkout follows the runbook. Published claims match flows verified at the release URL. |

**Target** · 100% line coverage across executable application code. Report branch coverage alongside it. Run coverage work alongside the lifecycle slice and increase the CI floor as gaps close. [Implementation guide](IMPLEMENTATION.md) · [Current CI](../.github/workflows/verify.yml)

**Open decisions** · Archive, restore, and deletion effects. Task transitions, assignment, and viewer access. Inventory and schedule semantics. Report calculations and export rules. Record each decision before starting its first dependent slice. [Implementation guide](IMPLEMENTATION.md)
