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

## Project tasks

On Project Details, select **Show tasks** to open the owner task board. Use **Add task** to create one, **Edit** to change its fields, and **Delete** to open a permanent deletion confirmation. Move a task between status columns by dragging it, or open **Edit** and select a status with the keyboard or touch. The task deadline field uses your browser’s local time. Owners can still read the board after archiving a project.
