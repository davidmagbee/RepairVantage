# Domain documentation

RepairVantage uses a single domain context across `client/` and `server/`. Read [GLOSSARY.md](../../GLOSSARY.md) before planning, implementing, or reviewing a change to repair workflows.

- Use glossary terms in user stories, issue titles, code, and test names. Verify current behavior against the schema and implementation.
- Read relevant ADRs under `docs/adr/` when present. Surface conflicts with a decision before revising it.
- Use `$grill-with-docs` to resolve unclear terms and business rules with the maintainer. Update the glossary when terms settle. Add an ADR when a hard-to-reverse decision had a real alternative and its reasoning would otherwise be lost.
