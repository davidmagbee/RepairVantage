# RepairVantage

RepairVantage gives repair project owners a private workspace for tracking status and sharing updates. A visitor can read the landing page and open an unlisted Showcase link. Workspace access requires Google or a verified email code.

- **Owners** create projects, update status, invite people, and manage Showcase links.
- **Invited members** can read shared project details and add comments. Owners control access.
- **Showcase visitors** see the separately published title, summary, and current status. Comments and internal fields stay in the workspace.

The frontend is React and Vite. The same-origin backend is Express, Apollo GraphQL, Better Auth, Prisma, and PostgreSQL.

## Develop

Use Node 24 and a disposable local PostgreSQL database. See the [server setup](server/README.md) for configuration and migration commands. Then start the server and client in separate terminals.

```sh
npm ci --prefix client
npm ci --prefix server
npm --prefix server run dev
npm --prefix client run dev
```

Open `http://localhost:5173`. The dev server proxies GraphQL and authentication to the local Express process. Keep that hostname for both the browser and Google callback configuration.

- [Engineering runbook and verification](docs/ENGINEERING.md)
- [Implementation guide](docs/IMPLEMENTATION.md)
- [Deployment and release gates](docs/DEPLOYMENT.md)
- [Roadmap](docs/ROADMAP.md)
- [Project skill installation and provenance](docs/agents/SKILLS.md)
