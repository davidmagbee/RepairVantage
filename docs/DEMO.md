# Opt-in demonstration projects

The account owner authorized importing the legacy mock projects for their demonstration account. This is a narrow exception to the default policy of keeping fixtures outside production. The CLI accepts an explicit account; it never runs during application startup, builds, or migrations.

Source: `main` commit `bd46f74aed4af2b913acabfc9c4d14a533961cf3`, `client/src/pages/ProjectList.tsx`. Five projects retain their names, budgets, statuses, and historical 2023 end dates. Legacy `Planning` and `Not Started` map to `PLANNED`. Unsupported client/progress fields and contradictory Dashboard aggregates are omitted. No tasks, inventory, expenses, sharing, or public Showcases are fabricated.

Build the server first. Set `DEMO_DATABASE_URL` explicitly through a trusted local environment; the CLI does not read dotenv files or fall back to `DATABASE_URL` or `DIRECT_DATABASE_URL`. Remote connections enforce certificate and hostname verification. Do not paste connection strings into tickets, commits, or terminal output.

```sh
npm --prefix server run build
node server/scripts/seed-demo.cjs --email account@example.com
node server/scripts/seed-demo.cjs --email account@example.com --apply
```

The seed invocation without `--apply` previews supported fixture summaries and counts without writes. The target email must already belong to a verified account. Sign in through the normal email-code flow first if necessary; the script never creates or changes users, credentials, sessions, or verification records.

Apply inserts all missing projects in one transaction. Deterministic account-scoped IDs make reruns skip existing fixtures, preserving edits. An ownership mismatch aborts the transaction. Existing unrelated projects remain untouched. Imported descriptions identify sample data, and all projects remain private until the owner explicitly shares or publishes them.

Verify by signing in as the target account: the project list should show the five sample projects; open one and confirm its status. Run the preview again: five skipped fixtures, zero proposed creations. Sign in as another account and confirm these projects are absent. Historical dates intentionally do not populate current-week calendar views.

Integration verification uses the existing disposable PostgreSQL guard:

```sh
TEST_DATABASE_URL="$RV_TEST_DATABASE_URL" node --test server/test/demo-seed.test.cjs
```

The test checks missing/unverified accounts, dry-run immutability, source fixture values, private ownership, edit preservation, and transaction rollback on ownership conflict. It creates and cleans up only randomized test accounts.
