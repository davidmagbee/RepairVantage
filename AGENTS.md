# RepairVantage

React/Vite client in `client/`. Express/GraphQL and Prisma/PostgreSQL in `server/`. Each package owns its lockfile and scripts.

- Start multi-step work with `$dev-session`. Read [the roadmap](docs/ROADMAP.md) for scope and [the development runbook](docs/ENGINEERING.md) for commands and handoffs. Use `$dev-review` on the actual diff, including new files.
- Keep one observable workflow per slice. Document non-obvious behavior in code. For access changes, exercise both owners and unauthorized callers at the API boundary.
- Use [the glossary](GLOSSARY.md) and [domain conventions](docs/agents/domain.md) for terminology. See [skill routing](docs/agents/SKILLS.md), [issue tracking](docs/agents/issue-tracker.md), and [triage labels](docs/agents/triage-labels.md) when the task needs them.
- Keep project records private by default. Use disposable PostgreSQL for integration tests and migrations under development. Keep test accounts, fixtures, and connection strings out of production releases.
- Documentation is part of every commit and push. Follow the [documentation checkpoint](docs/ENGINEERING.md#documentation-checkpoint) and include all affected updates with the change.
- Handoff includes a conventional commit message, staging groups for separate changes, PR body and applicable post-push delta, and manual QA. Use [the PR template](.github/pull_request_template.md).
