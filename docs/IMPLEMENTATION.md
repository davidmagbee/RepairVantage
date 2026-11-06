# RepairVantage implementation guide

The original Cursor plan provides the feature inventory. Implement it with the repository's lockfiles and current stack. [Original plan](../.cursorrules) · [Roadmap](ROADMAP.md) · [Engineering runbook](ENGINEERING.md) · [Deployment runbook](DEPLOYMENT.md)

## Implemented foundation

| Boundary | Current behavior and source |
| --- | --- |
| Runtime | React/Vite and Express/Apollo share one origin. Prisma uses PostgreSQL. Vercel packaging builds a reviewed commit and keeps browser assets separate from server runtime code. [App routes](../client/src/App.tsx) · [HTTP app](../server/src/app.ts) · [Packaging](../scripts/package-vercel.mjs) |
| Identity | Better Auth resolves a verified principal through Google or email code. Workspace routes require a verified session. [Identity](../server/src/identity.mts) · [Private routes](../client/src/components/PrivateRoute.tsx) |
| Projects | The UI creates projects with name and optional description, lists owned and shared projects, and lets owners change status. The owner editor for name and description is implemented in this checkout. The API already supports owner-scoped updates and deletion. [Project form](../client/src/pages/NewProject.tsx) · [Details](../client/src/pages/ProjectDetails.tsx) · [Resolvers](../server/src/graphql/resolvers/index.ts) |
| Sharing | The owner copies an invitation link scoped to the recipient's verified email. Members can read shared details and comment. Owner controls include revocation, member removal, and Showcase publication. The Showcase projection contains its own title and summary, publication time, and current project status. [Sharing UI](../client/src/components/ProjectSharing.tsx) · [Sharing resolvers](../server/src/graphql/resolvers/sharing.ts) |
| Reserved scope | Tasks have owner-scoped create and read operations. Parts, tools, dependencies, and calendar events have Prisma models. Workflow UI and the remaining API operations are future slices. [GraphQL schema](../server/src/graphql/schema/index.ts) · [Prisma schema](../server/prisma/schema.prisma) |

## Quality gate

**Target** · 100% line coverage across first-party executable application code. Report branches, functions, and statements separately. Require explicit allowed and denied behavior tests for access policy changes. [Google coverage guidance](https://testing.googleblog.com/2020/08/code-coverage-best-practices.html)

**Scope** · `client/src`, `server/src`, and the deployed Express entry in `scripts/vercel`. The denominator includes unloaded executable files. It excludes generated code, declarations, dependencies, tests, and build tooling.

1. Measure every first-party application source file in the browser and server, including files never loaded by a test. Map compiled results to TypeScript. Record the baseline and report each package separately.
2. Cover behavior through the closest real boundary. Use unit tests for deterministic rules, PostgreSQL integration tests for data and authorization, and Chromium for routes, forms, and session transitions. Keep hosted provider smoke separate. [Existing suites](../.github/workflows/verify.yml)
3. Raise the CI coverage floor as gaps close. Use the strict coverage command to check the 100% line target. Keep a separate acceptance check for each security boundary and persistent write. [Coverage commands](ENGINEERING.md)

## Project lifecycle

**First slice** · Owner editing of project name and description on Project Details reuses the owner-scoped `updateProject` mutation. The editor submits these two fields independently of the status control.

- Prefill current values. Trim the name and enforce the API's existing validation. Clearing description persists a null value. Cancel leaves stored data intact. [Existing validator](../server/src/graphql/resolvers/index.ts)
- On save, update the detail and list views. Reload and confirm the same values. On failure, keep edits available and report the error. Cover empty name, description clearing, and denied member or unrelated writes through GraphQL.
- Later, agree on which other metadata to expose and whether status changes need transitions. Decide archive, restore, and deletion effects on tasks, comments, members, pending invitations, and published Showcase links before adding those controls.

## Tasks

1. Expose the existing owner-only task read and create paths inside a project. Cover empty states, due-date validation, reload, and refusal of writes or reads from a different project owner. [Task API](../server/src/graphql/schema/index.ts) · [Task resolvers](../server/src/graphql/resolvers/index.ts)
2. Add task edit and completion after defining allowed transitions and when completion time is stored. Test invalid transitions, stale updates, and direct ID and nested-query access.
3. Confirm whether a task assignee must be a member and whether assignment grants task access. Add a board only when the underlying transitions work. Provide keyboard-accessible status changes alongside drag and drop.

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
