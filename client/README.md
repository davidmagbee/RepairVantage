# RepairVantage client

React, Vite, React Router, Apollo Client, and Better Auth power the browser app.

## Local development

Use the Node version in the repository's `.nvmrc`. Start the Express server using the [repository runbook](../docs/ENGINEERING.md), then run these commands from `client/`.

```sh
npm ci
npm run dev -- --strictPort
```

Open `http://localhost:5173`. Vite proxies `/api/auth`, `/api/eligibility` and `/graphql` to Express on loopback port 4000. The browser origin must match the server's configured origin for OAuth, cookies, and request validation.

## Browser icon

The standalone [favicon](public/favicon.svg) uses a black house outline and wrench with an orange-handled screwdriver, without a window. A white rounded backplate preserves contrast on dark browser tabs. `index.html` references this local SVG; no icon package, font or external request is needed. It shipped in the [2026-11-25 local-time release](../docs/DEPLOYMENT.md#release-2026-11-25--local-time-layout-and-favicon). Hard-refresh or open a fresh tab when reviewing a cached browser icon.

## Account eligibility and privacy

Login and registration screen age before email/Google account actions. After authentication, both new and existing accounts must explicitly acknowledge the current 18+ declaration before workspace or invitation access. A failed policy read blocks access with retry; sign-out and `/privacy` remain available. A private API policy denial refreshes the acknowledgment gate. These are self-declarations, not verified age. The public notice links the approved privacy/deletion mailbox. [Behavior, release prerequisites and country expansion](../docs/ACCOUNT-ELIGIBILITY.md).

## Project navigation

Open an owned or shared project by clicking anywhere on its card, or focus the card with Tab and press Enter. Owners can edit the project details and save status and priority independently. Members can read these fields and comment.

## Time-zone preference

Use **Time zone** above the workspace to choose how dates display and edit. The initial preference uses the device's IANA time zone; unavailable or invalid detection falls back to **Eastern Time · New York** (`America/New_York`, including daylight saving). Choose another zone manually or select **Use device time zone** to replace the preference with the current device zone. The choice persists in this browser; it is not synced to the account. Restricted browser storage still permits a choice for the current session.

Project dates, task deadlines/completion, dashboard dates, comments, invitation expiry and report dates use the selected zone. Stored instants and CSV expense timestamps remain UTC. An open project-date or task editor keeps the zone shown when it opened, even if the workspace preference changes. Close and reopen the editor to use the new zone.

Times skipped when clocks move forward are rejected. When a typed time occurs twice as clocks move back, choose **First occurrence** or **Second occurrence**. Untouched timestamps retain their seconds, milliseconds and saved occurrence; the inputs display minutes.

## Verification

```sh
npm run lint
npm run build
npx --no-install playwright install chromium
npm test
```

The default Playwright suite uses intercepted HTTP responses. To exercise real cookie sessions, owner edits and priority persistence, invitation acceptance, comments, and Showcase publishing, start the [disposable browser-test server](../server/test/browser-server.cjs) with a migrated local test database. Run the opt-in suite against that server.

```sh
REAL_API=1 npm test -- tests/projects.full-stack.spec.ts
```

Production hosting must route API requests to Express and serve the React entry point for browser routes. The app expects same-origin API requests.

## Archived projects

Owners can archive or restore a project from its details page. An Archived badge appears on its card. Members can still read details and comments. The owner can revoke invitations, remove members, or unpublish Showcase while the project is archived.

To permanently delete an active project, select **Delete project permanently** and accept the confirmation naming the project. Deletion removes related work and sharing. Restore an archived project before deleting it.

## Project tasks

On Project Details, select **Show tasks**. Owners see all project tasks and can add, edit, delete, and assign them to existing project members. Choose **Unassigned** to clear an assignment. Members see only tasks assigned to them and can edit those tasks on active projects. To change status, drag a task to a column or open **Edit** and select a status with the keyboard or touch. The task deadline uses the selected [time-zone preference](#time-zone-preference). The board is read-only while the project is archived.

## Project reports

The real-API acceptance test covers email-code sign-in, expense persistence after reload, matching CSV totals and rows, spreadsheet formula protection, and print invocation. With the disposable browser-test server running, use `REAL_API=1 npm test -- tests/report.full-stack.spec.ts`.

Enter estimated and actual time in decimal hours on a task. Owners can open the project report to see both time totals and record actual expenses in USD. Use **Download CSV** for spreadsheet data or **Print / Save as PDF**, then select your browser’s **Save as PDF** destination. Archived project reports remain readable.

## Inventory

Open **Inventory** in workspace navigation to add or edit parts and tools and their on-hand counts. Select **Show requirements** on an owned project to set or remove an item quantity. Required quantities replace the previous value. The inventory forecast sums planned, in-progress, and on-hold projects that are active. Archived requirements remain readable.

## Project schedule dates

On active owned projects, select **Edit dates**. Enter optional **Project start** and **Project end** values in the editor's displayed time zone. **Save dates** updates only changed endpoints; clearing an endpoint removes it. The end cannot precede the start. Failed saves retain the draft; **Cancel** leaves stored dates intact. Members and archived projects show dates without editing controls.

Open **Schedule** and choose an inclusive **From date** / **Through date** range of up to 93 calendar days. Range boundaries and calendar/timeline placement follow the selected zone, including 23- and 25-hour daylight-saving days. The calendar places an item on its first visible date; the timeline shows its visible span. Unchanged endpoints retain their original precision even though the editor displays minutes.

The Project Details overview puts identity/status above adjacent Schedule and Project settings areas on wide screens. Status and priority retain separate save controls. Narrow screens collapse the areas; detail editing, report and archive actions remain grouped below them.

## Portfolio-reference workspace

The restored workspace matches the portfolio screenshot's indigo navigation, summary cards, dashboard panels, and light styling. It reached `main` and production; the old design branch is retired. Open **Dashboard** at `/projects/dashboard`; sign-in destinations and the default project list remain unchanged. Project search and status filters operate on the account-scoped owned and shared lists.

Dashboard totals exclude archived projects and shared projects. Active means Planned, In progress, or On hold. Upcoming deadlines are unfinished tasks in active projects over the next seven days, capped at five. Dates display in the selected zone; the rolling deadline window is unchanged. **Recent project updates** shows saved project timestamps, not a historical activity log. [Design reference](../docs/UI-REFERENCE.md).
