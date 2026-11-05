# RepairVantage client

React, Vite, React Router, Apollo Client, and Better Auth power the browser app.

## Local development

Use the Node version in the repository's `.nvmrc`. Start the Express server using the [repository runbook](../docs/ENGINEERING.md), then run these commands from `client/`.

```sh
npm ci
npm run dev -- --strictPort
```

Open `http://localhost:5173`. Vite proxies `/api/auth` and `/graphql` to Express on loopback port 4000. The browser origin must match the server's configured origin for OAuth, cookies, and request validation.

## Verification

```sh
npm run lint
npm run build
npx --no-install playwright install chromium
npm test
```

The default Playwright suite uses intercepted HTTP responses. To exercise real cookie sessions, persistence, invitation acceptance, comments, and Showcase publishing, start the [disposable browser-test server](../server/test/browser-server.cjs) with a migrated local test database. Run the opt-in suite against that server.

```sh
REAL_API=1 npm test -- tests/projects.full-stack.spec.ts
```

Production hosting must route API requests to Express and serve the React entry point for browser routes. The app expects same-origin API requests.
