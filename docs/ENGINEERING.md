# Engineering runbook

## Start and finish a slice

1. Start in this checkout. Ask `$dev-session` for one observable outcome and one denial case if the slice changes access. Read only the owning source, matching [skill](agents/SKILLS.md), and relevant [roadmap milestone](ROADMAP.md).
2. For a policy or workflow change, use `$grill-with-docs` to settle the decisions that affect users or persisted data. Use `$tdd` to reproduce one behavior through its real interface, then make it pass. For a bug with competing causes, use `$diagnosing-bugs` first.
3. Run the owning package checks. Use `$dev-review` on the base diff, staged and unstaged changes, and relevant new files. For an auth change, verify allowed and denied behavior with separate accounts.
4. Use the [PR template](../.github/pull_request_template.md). Record the commit or dirty state, check evidence, manual acceptance still due, and the next executable action. Add a delta when updating a pushed branch.

For coaching, use `$deliberate-practice` and ask to attempt the exercise before receiving hints. For planning, use the glossary and record durable decisions only when the tradeoff is hard to reverse. Use the tracker conventions when opening or triaging issues.

## Local checks

Install each package from its lockfile. Run the commands from the repository root.

```sh
npm ci --prefix client
npm ci --prefix server
npm --prefix client run lint
npm --prefix client run build
npm --prefix server run build
```

Build and lint cover compile-time behavior. A passing build says nothing about account isolation or PostgreSQL connectivity. Use an isolated PostgreSQL instance for schema and integration checks. Never select a shared database from inherited shell variables. Run development commands from the package that owns them so local configuration resolves correctly.

With a dedicated loopback database whose name ends in `_test`, explicitly set `TEST_DATABASE_URL` and run:

```sh
DIRECT_DATABASE_URL="$TEST_DATABASE_URL" npm --prefix server run prisma:deploy
npm --prefix server test
npm --prefix server run test:integration
npm --prefix server run test:auth
```

Run `npm --prefix client test` for Chromium tests with mocked network boundaries. For the real local workflow, start `node server/test/browser-server.cjs` with the disposable URL, then run `REAL_API=1 npm --prefix client test`. The test server sends codes to a loopback-only mail sink. CI installs Chromium and runs this path against a disposable service database.

## Local Codex harness

The project is registered in the machine-local Modular Codex Harness. The helper is optional. All checks have direct package commands above.

```sh
harness_dir='/Users/interface/Documents/ChatGPT/interface'
python3 "$harness_dir/tools/harness.py" inspect --repo "$PWD"
python3 "$harness_dir/tools/harness.py" verify --project "$harness_dir/projects/repairvantage.json" \
  --check client-lint --check client-build --check server-build
python3 "$harness_dir/tools/harness.py" handoff --run /absolute/path/to/run-directory
```

The verifier executes reviewed commands and stores a fresh result with Git state and logs. The registry excludes database and deployment actions. Attach the result path in a local handoff. Review logs before sharing.

**Unknown** · Whether this workflow reduces tokens or elapsed time. Use the harness evaluation protocol to compare matched tasks with the same acceptance checks. The installed `harness-daily` and `harness-deep` profiles are CLI choices. In the desktop app choose the reasoning effort per task.
