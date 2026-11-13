# RepairVantage implementation guide

The [original Cursor plan](../.cursorrules) supplies the feature inventory. Its setup, database, backend, frontend, and identity phases map to the foundation below. The [roadmap](ROADMAP.md) sequences the product phases and tracks release status. Use the package lockfiles for dependencies. Test, refine, and update documentation throughout delivery. [Engineering runbook](ENGINEERING.md) · [Deployment runbook](DEPLOYMENT.md)

## Implemented foundation

| Boundary | Current behavior and source |
| --- | --- |
| Runtime | React/Vite and Express/Apollo share one origin. Prisma 7 uses the PostgreSQL adapter for the application and a direct migration URL for the CLI. Production enforces TLS certificate and hostname verification. Vercel packaging builds a reviewed commit and keeps browser assets separate from server runtime code. [App routes](../client/src/App.tsx) · [Server setup](../server/README.md) · [Deployment](DEPLOYMENT.md) |
| Identity | The approved authentication contract is Better Auth's verified cookie session through Google or an email code. Workspace routes require a verified session. [Identity](../server/src/identity.mts) · [Private routes](../client/src/components/PrivateRoute.tsx) |
| Projects | Create projects with a name and optional description. Open owned and shared projects from anywhere on their cards. Owners can edit name, description, status, priority, and optional UTC schedule dates. The API supports owner-scoped updates and deletion. [Project form](../client/src/pages/NewProject.tsx) · [Project list](../client/src/pages/ProjectList.tsx) · [Details](../client/src/pages/ProjectDetails.tsx) · [Resolvers](../server/src/graphql/resolvers/index.ts) |
| Sharing | The owner copies an invitation link scoped to the recipient's verified email. Members can read shared details and comment. Owner controls include revocation, member removal, and Showcase publication. The Showcase projection contains its own title and summary, publication time, and current project status. [Sharing UI](../client/src/components/ProjectSharing.tsx) · [Sharing resolvers](../server/src/graphql/resolvers/sharing.ts) |
| Tasks | The deployed workspace includes owner-scoped CRUD, completion tracking, assignment, and a status board. Owner project inventory and stock shortfalls are implemented below; task-level inventory, dependencies, and calendar events remain later slices. [Task API](../server/src/graphql/schema/tasks.ts) · [Prisma schema](../server/prisma/schema.prisma) |

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

**Deployed** · Owners can archive and restore projects. Archival is separate from repair status. An archived project remains readable for the owner and existing members, including comments. Its published Showcase URL stays available.

- Enforce the read-only rule at the API boundary for edits, new tasks, comments, publications, and invitations. Serialize archival with concurrent writes to the project and its child records. Exercise both write orderings on PostgreSQL.
- Honor valid invitations issued before archival. Invitees join with read-only access until restore. Owners can still revoke invitations, remove members, and unpublish Showcase while archived.
- Test the exceptions with the project archived. Verify that revoked or expired invitations still fail, and that member removal and unpublishing end access.
- Owners can permanently delete an active project after accepting the confirmation naming the project. Restore an archived project before deleting it. Verify cancel and failed writes leave the project intact. [Deletion test](../client/tests/project-delete.spec.ts)

## Tasks

1. Open **Show tasks** on Project Details to list, create, edit, or delete owner tasks. Archived tasks are readable. Confirm permanent deletion of a task and its related links. [Task board](../client/src/components/ProjectTasks.tsx) · [Task API](../server/src/graphql/schema/tasks.ts)
2. Move between any of the five defined statuses by dragging a card or editing its status with the keyboard. Entering Completed records the time, repeated completion preserves it, and reopening clears it. Leaving description or due date blank clears that field. [Task tests](../server/test/tasks.test.cjs)
3. Owners can assign or unassign current verified project members. Members see only tasks assigned to them and can edit those tasks while the project is active. Owners control creation, deletion, and reassignment. Membership removal clears assignments. New tasks and legacy tasks carrying their owner's ID display as unassigned. [Assignment tests](../server/test/task-assignment.test.cjs)

## Parts and tools

1. Owners create and edit private part and tool catalogs. Stock is a whole-number on-hand count. Legacy unowned rows and their links remain stored for explicit migration. [Inventory API](../server/src/graphql/schema/inventory.ts)
2. Set or remove project requirements. Setting a quantity replaces the previous count. Requirements leave stock unchanged. Archive freezes changes and retains readable requirements. [Inventory tests](../server/test/inventory.test.cjs)
3. Forecast shortfalls from planned, in-progress, and on-hold projects with no archive timestamp. Subtract on-hand stock and floor the result at zero. Task-level requirements and reservations are separate future slices.

## Dependencies and scheduling

1. Define which task, part, and tool prerequisite edges are valid and when a prerequisite blocks work. Implement one edge type first. Reject self-links, forbidden cross-project links, and cycles, including conflicting concurrent writes. [Current dependency and event models](../server/prisma/schema.prisma)
2. Open **Schedule** for an owner-scoped UTC calendar and timeline over existing project dates and task deadlines. It shows assigned members and required project tools. Set a task deadline to add it to the view. Owners can author optional UTC project start/end dates through **Edit dates**, including clearing endpoints. Date writes reject reversed ranges using stored plus changed endpoints under the project lock. Unchanged endpoints retain seconds. Calendar event authoring and allocation enforcement remain separate slices.
3. Add the Gantt view after date and dependency semantics settle. Verify display and editing against the same stored dates and prerequisites.

## Reporting, export, and documentation

1. Owners can record actual USD expenses in whole cents and see estimated and actual task hours in **Project report**. Assignees can record hours on their assigned tasks. Archive preserves reports and freezes writes.
2. Download the current report as CSV. Use **Print / Save as PDF** to create a PDF through the browser print dialog. Search and filtering remain separate slices.
3. With each slice, update setup instructions, API contracts, usage steps, and the release evidence needed to demonstrate it. Document migration and rollback implications when schema changes ship. [Setup](../README.md) · [API runbook](../server/README.md) · [Deployment](DEPLOYMENT.md)
