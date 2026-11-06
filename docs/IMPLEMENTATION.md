# RepairVantage implementation guide

The [original Cursor plan](../.cursorrules) supplies the feature inventory. Its setup, database, backend, frontend, and identity phases map to the foundation below. The [roadmap](ROADMAP.md) sequences the product phases and tracks release status. Use the package lockfiles for dependencies. Test, refine, and update documentation throughout delivery. [Engineering runbook](ENGINEERING.md) · [Deployment runbook](DEPLOYMENT.md)

## Implemented foundation

| Boundary | Current behavior and source |
| --- | --- |
| Runtime | React/Vite and Express/Apollo share one origin. Prisma 7 uses the PostgreSQL adapter for the application and a direct migration URL for the CLI. Production enforces TLS certificate and hostname verification. Vercel packaging builds a reviewed commit and keeps browser assets separate from server runtime code. [App routes](../client/src/App.tsx) · [Server setup](../server/README.md) · [Deployment](DEPLOYMENT.md) |
| Identity | The approved authentication contract is Better Auth's verified cookie session through Google or an email code. Workspace routes require a verified session. [Identity](../server/src/identity.mts) · [Private routes](../client/src/components/PrivateRoute.tsx) |
| Projects | Create projects with a name and optional description. Open owned and shared projects from anywhere on their cards. Owners can edit name, description, status, and priority. The API supports owner-scoped updates and deletion. [Project form](../client/src/pages/NewProject.tsx) · [Project list](../client/src/pages/ProjectList.tsx) · [Details](../client/src/pages/ProjectDetails.tsx) · [Resolvers](../server/src/graphql/resolvers/index.ts) |
| Sharing | The owner copies an invitation link scoped to the recipient's verified email. Members can read shared details and comment. Owner controls include revocation, member removal, and Showcase publication. The Showcase projection contains its own title and summary, publication time, and current project status. [Sharing UI](../client/src/components/ProjectSharing.tsx) · [Sharing resolvers](../server/src/graphql/resolvers/sharing.ts) |
| Tasks | The development branch adds owner-scoped CRUD, completion tracking, and a status board. Parts, tools, dependencies, and calendar events have Prisma models for later slices. [Task API](../server/src/graphql/schema/tasks.ts) · [Prisma schema](../server/prisma/schema.prisma) |

## Quality gate

**Target** · 100% line coverage across first-party executable application code. Report branches, functions, and statements separately. Require explicit allowed and denied behavior tests for access policy changes. [Google coverage guidance](https://testing.googleblog.com/2020/08/code-coverage-best-practices.html)

**Scope** · `client/src`, `server/src`, and the deployed Express entry in `scripts/vercel`. The denominator includes unloaded executable files. It excludes generated code, declarations, dependencies, tests, and build tooling.

1. Measure every first-party application source file in the browser and server, including files never loaded by a test. Map compiled results to TypeScript. Record the baseline and report each package separately.
2. Cover behavior through the closest real boundary. Use unit tests for deterministic rules, PostgreSQL integration tests for data and authorization, and Chromium for routes, forms, and session transitions. Keep hosted provider smoke separate. [Existing suites](../.github/workflows/verify.yml)
3. Raise the CI coverage floor as gaps close. Use the strict coverage command to check the 100% line target. Keep a separate acceptance check for each security boundary and persistent write. [Coverage commands](ENGINEERING.md)

## Project lifecycle

**Shipped** · Whole-card navigation works for owned and shared projects. Project Details uses the owner-scoped `updateProject` mutation for name, description, status, and priority. Status and priority save independently. [Browser test](../client/tests/projects.full-stack.spec.ts)

- Prefill current values. Trim the name and enforce the API's existing validation. Clearing description persists a null value. Cancel leaves stored data intact. [Existing validator](../server/src/graphql/resolvers/index.ts)
- On save, update the detail and list views. Reload and confirm the same values. On failure, keep edits available and report the error. Cover empty name, description clearing, and denied member or unrelated writes through GraphQL.

**Development branch** · Owners can archive and restore projects. Archival is separate from repair status. An archived project remains readable for the owner and existing members, including comments. Its published Showcase URL stays available.

- Enforce the read-only rule at the API boundary for edits, new tasks, comments, publications, and invitations. Serialize archival with concurrent writes to the project and its child records. Exercise both write orderings on PostgreSQL.
- Honor valid invitations issued before archival. Invitees join with read-only access until restore. Owners can still revoke invitations, remove members, and unpublish Showcase while archived.
- Test the exceptions with the project archived. Verify that revoked or expired invitations still fail, and that member removal and unpublishing end access. Decide permanent deletion independently.

## Tasks

1. Open **Show tasks** on Project Details to list, create, edit, or delete owner tasks. Archived tasks are readable. Confirm permanent deletion of a task and its related links. [Task board](../client/src/components/ProjectTasks.tsx) · [Task API](../server/src/graphql/schema/tasks.ts)
2. Move between any of the five defined statuses by dragging a card or editing its status with the keyboard. Entering Completed records the time, repeated completion preserves it, and reopening clears it. Leaving description or due date blank clears that field. [Task tests](../server/test/tasks.test.cjs)
3. Assignment policy is approved. Owners assign current project members. Assignees can read and edit their own tasks while their membership is active.

## Parts and tools

1. Decide catalog ownership, quantity units, and whether the system tracks stock or only required items. Add owner-scoped part and tool lists and edits after that decision. [Current models](../server/prisma/schema.prisma)
2. Assign one part or tool to a project or task with an explicit quantity. Reject cross-owner references and invalid quantities. Define whether repeats replace or increment. Test concurrent requests against PostgreSQL.
3. Add reservation, stock movement, or forecasting only after the inventory meaning is approved and persisted data can support it.

## Dependencies and scheduling

1. Define which task, part, and tool prerequisite edges are valid and when a prerequisite blocks work. Implement one edge type first. Reject self-links, forbidden cross-project links, and cycles, including conflicting concurrent writes. [Current dependency and event models](../server/prisma/schema.prisma)
2. Decide time zone, all-day boundaries, and whether events derive from task dates or are authored independently. Add one authorized calendar view. Test date-range edges, daylight-saving transitions, and ownership.
3. Add the Gantt view after date and dependency semantics settle. Verify display and editing against the same stored dates and prerequisites.

## Reporting, export, and documentation

1. Agree on cost inputs, currency and rounding, and estimated versus actual time. Start with an owner-scoped summary reconciled to a known PostgreSQL fixture. Add search and filters with stable ordering and explicit access rules.
2. Export the filtered report as CSV. Cover column order, quoting, Unicode, formula-like user text, and the same authorization as the source report. Add PDF after the report fields and format settle.
3. With each slice, update setup instructions, API contracts, usage steps, and the release evidence needed to demonstrate it. Document migration and rollback implications when schema changes ship. [Setup](../README.md) · [API runbook](../server/README.md) · [Deployment](DEPLOYMENT.md)
