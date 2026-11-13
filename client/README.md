# RepairVantage client

React, Vite, React Router, Apollo Client, and Better Auth power the browser app.

## Local development

Use the Node version in the repository's `.nvmrc`. Start the Express server using the [repository runbook](../docs/ENGINEERING.md), then run these commands from `client/`.

```sh
npm ci
npm run dev -- --strictPort
```

Open `http://localhost:5173`. Vite proxies `/api/auth` and `/graphql` to Express on loopback port 4000. The browser origin must match the server's configured origin for OAuth, cookies, and request validation.

## Project navigation

Open an owned or shared project by clicking anywhere on its card, or focus the card with Tab and press Enter. Owners can edit the project details and save status and priority independently. Members can read these fields and comment.

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

On Project Details, select **Show tasks**. Owners see all project tasks and can add, edit, delete, and assign them to existing project members. Choose **Unassigned** to clear an assignment. Members see only tasks assigned to them and can edit those tasks on active projects. To change status, drag a task to a column or open **Edit** and select a status with the keyboard or touch. The task deadline field uses your browser’s local time. The board is read-only while the project is archived.

## Project reports

The real-API acceptance test covers email-code sign-in, expense persistence after reload, matching CSV totals and rows, spreadsheet formula protection, and print invocation. With the disposable browser-test server running, use `REAL_API=1 npm test -- tests/report.full-stack.spec.ts`.

Enter estimated and actual time in decimal hours on a task. Owners can open the project report to see both time totals and record actual expenses in USD. Use **Download CSV** for spreadsheet data or **Print / Save as PDF**, then select your browser’s **Save as PDF** destination. Archived project reports remain readable.

## Inventory

Open **Inventory** in workspace navigation to add or edit parts and tools and their on-hand counts. Select **Show requirements** on an owned project to set or remove an item quantity. Required quantities replace the previous value. The inventory forecast sums planned, in-progress, and on-hold projects that are active. Archived requirements remain readable.

## Project schedule dates

On active owned projects, select **Edit dates**. Enter optional **Project start (UTC)** and **Project end (UTC)** values. These times use UTC regardless of the browser timezone. **Save dates** updates only changed endpoints; clearing an endpoint removes it. The end cannot precede the start. Failed saves retain the draft; **Cancel** leaves stored dates intact. Members and archived projects show dates without editing controls.

Open **Schedule** and choose a range containing the project dates to see the project in the calendar or timeline. Unchanged endpoints retain their original seconds even though the editor displays minutes.
