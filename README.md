# RepairVantage

RepairVantage gives repair project owners a private workspace for tracking status and sharing updates. A visitor can read the landing page and open an unlisted Showcase link. Workspace access requires Google or a verified email code.

[Open RepairVantage](https://repairvantage.davidmagbee.com/)

- **Owners** create projects, edit details, status, and priority, invite people, and manage Showcase links.
- **Invited members** can read shared project details and add comments. Owners control access.
- **Showcase visitors** see the separately published title, summary, and current status. Comments and internal fields stay in the workspace.

Click anywhere on an owned or shared project card to open its details. Keyboard users can focus the card and press Enter.

## Project status

**Development branch.** The owner workspace and sharing workflows are live. The development branch adds archive and restore, confirmed deletion, a task board with member assignment, owner inventory with stock shortfalls, scheduling views, and project reports. The [roadmap](docs/ROADMAP.md) tracks release verification and later phases. The [implementation guide](docs/IMPLEMENTATION.md) translates the original [Cursor plan](.cursorrules) into acceptance criteria.

The frontend is React and Vite. The same-origin backend is Express, Apollo GraphQL, Better Auth, Prisma 7, and PostgreSQL.

## Develop

Use the version in [`.nvmrc`](.nvmrc) and a disposable local PostgreSQL database. Configure the ignored `server/.env` using the [server setup](server/README.md), then install and migrate from the repository root.

```sh
npm ci --prefix client
npm ci --prefix server
npm --prefix server run prisma:deploy
```

Start the server and client in separate terminals.

```sh
npm --prefix server run dev
npm --prefix client run dev
```

Open `http://localhost:5173`. The dev server proxies GraphQL and authentication to the local Express process. Keep that hostname for both the browser and Google callback configuration.

- [Engineering runbook and verification](docs/ENGINEERING.md)
- [Deployment and release gates](docs/DEPLOYMENT.md)
- [Opt-in demonstration projects](docs/DEMO.md)
- [Project skill installation and provenance](docs/agents/SKILLS.md)
