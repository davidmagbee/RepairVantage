# RepairVantage

RepairVantage gives repair project owners a private workspace for tracking status and sharing updates. A visitor can read the landing page and open an unlisted Showcase link. Workspace access requires verified sign-in and current 18+ eligibility acknowledgment.

[Open RepairVantage](https://repairvantage.davidmagbee.com/)

- **Owners** create projects, edit details, status, priority, and schedule dates, invite people, and manage Showcase links.
- **Invited members** can read shared project details and add comments. Owners control access.
- **Showcase visitors** see the separately published title, summary, and current status. Comments and internal fields stay in the workspace.

Click anywhere on an owned or shared project card to open its details. Keyboard users can focus the card and press Enter.

## Project status

**Historical foundation · 2026-11-13.** The owner workspace includes archive and restore, confirmed deletion, a task board with member assignment, owner inventory with stock shortfalls, UTC project-date editing and scheduling views, and USD expense/hour reports with CSV export and printing. [Release `935418c`](docs/DEPLOYMENT.md#release-2026-11-13) was deployed at the canonical URL. The owner confirmed that release's unchanged production sign-in and account-linking flows; new feature walkthroughs remain owner QA. The [roadmap](docs/ROADMAP.md) tracks those checks and remaining dependency, calendar-event, conflict, reporting, and UX work. The [implementation guide](docs/IMPLEMENTATION.md) translates the original [Cursor plan](.cursorrules) into acceptance criteria.

Production includes the restored portfolio-reference UI, [18+ acknowledgment/privacy workflow](docs/ACCOUNT-ELIGIBILITY.md), local time-zone display/editing, a wider Project Details layout and the repair-tools favicon. [PR #9](https://github.com/davidmagbee/RepairVantage/pull/9) merged at `c970593`; that exact merged source was promoted on 2026-11-25 after PR/main CI passed. No migration or authentication/provider setting changed in this release. [Release evidence](docs/DEPLOYMENT.md#release-2026-11-25--local-time-layout-and-favicon) · [Current handoff](docs/HANDOFF.md) · [Design reference](docs/UI-REFERENCE.md).

Dates display and edit in the selected zone; device detection defaults the browser preference, with Eastern Time as fallback. UTC storage and CSV timestamps remain unchanged. Local acceptance and release checks passed; authenticated owner feature acceptance remains separate. Future feature branches start from updated `main`. [Usage and daylight-saving behavior](client/README.md#time-zone-preference) · [Verification and next steps](docs/HANDOFF.md).

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
