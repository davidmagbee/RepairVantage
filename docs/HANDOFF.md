# RepairVantage · fresh-chat handoff

Updated 2026-11-24 for owner audience/eligibility decisions; production observations below remain dated 2026-11-18. Read [AGENTS](../AGENTS.md), [roadmap](ROADMAP.md), [engineering](ENGINEERING.md), and this file before editing. Repository: `/Users/interface/code/RepairVantage`; React/Vite client, Express/Apollo/Better Auth/Prisma/PostgreSQL server. Each package owns its lockfile and commands.

## Evidence classes

**Fact** means observed source/provider state, a recorded check, or an explicitly attributed owner report. **Inference** means a recommendation/interpretation. **Unknown** means not verified. Do not convert historical passes or user-reported acceptance into newly executed tests.

## Execution update · 2026-11-24

**Fact:** [PR #5](https://github.com/davidmagbee/RepairVantage/pull/5) consolidated integration `5b513d9` into `main` at `ca8fe43` with a merge commit after PR Verify passed and independent source review. Future feature PRs target updated `main`. Main CI/pruning are separate checks; do not recreate the consolidation PR.

**Fact:** the fresh local baseline passed 48 Node and 71 Chromium tests, 99.03% lines and 96.82% branches (`coverage/run-YouhOV/report/`), lint/build and desktop/mobile checks on the immutable package. Captures used synthetic responses, not production accounts. A runtime audit found one Effect advisory reported through three high-severity dependency paths. The `dev/runtime-audit-fix` slice pins patched Effect 3.22.1 only under `@prisma/config`; UI promotion is held until its checks complete. Existing production remains the recorded `935418c` release at this checkpoint.

**Owner direction:** existing accounts must explicitly acknowledge the current 18+ rule; do not backfill acceptance from verified email or the owner's familiarity with users. Acknowledgment is a self-declaration with server timestamp/version, not verified age. US-only describes the intended launch market; geographic restrictions require a separate, documented decision. Record expansion steps with the eligibility slice.

## Historical source and production snapshot · 2026-11-18

- **Fact:** [PR #3](https://github.com/davidmagbee/RepairVantage/pull/3) merged into `dev/engineering-harness` on 2026-11-18 at `5d46f844a23f8d9e536853eca1498947fd6ff892`. Its tree equals UI head `039ae0b`. [Verify passed](https://github.com/davidmagbee/RepairVantage/actions/runs/43487681054).
- **Fact:** `origin/main` is still the original prototype `bd46f74`; GitHub already designates it as default. At the `5d46f84` snapshot it is 38 commits behind integration, with no unique commits. Portfolio `039ae0b` and report `fe17d2f` are both contained in integration, not in `main`.
- **Fact:** this handoff branch is `dev/handoff-main-consolidation`, based on `origin/dev/engineering-harness` at `5d46f84`. Its changes are documentation only. Check its PR/current HEAD rather than assuming the snapshot is still latest.
- **Fact:** read-only Vercel inspection on 2026-11-18 still resolved the canonical domain to `dpl_BovbvZrLoDipVbNVqmrLo7ouBj2A`, the recorded source `935418c` release. Public HTML still loaded `index-DXf-RjAI.js`; enforced CSP restricted fonts/scripts/styles/connections to self. **UI merged ≠ UI deployed.** [Production](https://repairvantage.davidmagbee.com) · [Release evidence](DEPLOYMENT.md#release-2026-11-13).
- **Fact:** Vercel reported no Git project link; repository Verify has no deploy step. **Unknown:** out-of-repository automation. Recheck before changing `main`. No main merge, branch deletion, deployment, production-data write, provider-setting change, or public legal-policy publication happened during this handoff task.

## Implemented scope and owner decisions

**Fact:** the deployed feature release includes private projects, owner details/status/priority editing, verified membership/invites/comments, explicit unlisted Showcases, archive/restore and confirmed deletion, task CRUD/board/member assignment, owner parts/tools and project stock shortfalls, UTC Schedule/calendar/timeline and project date editing, and USD task-time/expense reports with CSV/print.

**Fact:** merged UI restores the owner's [portfolio screenshot](design/portfolio-dashboard.png): indigo shell, real-data `/projects/dashboard`, summary cards/panels/status breakdown, project cards/search/filters, and shared form/table styling. [Reference and captures](UI-REFERENCE.md). Owner metrics exclude archived/shared projects; active means Planned/In progress/On hold. Recent updates are actual project timestamps, not a fabricated activity log. Sign-in/default project destinations remain unchanged.

**Fact — owner-confirmed:** existing production OTP sign-in, Google consent, and account linking. `2ce81ed → 935418c` changed no auth implementation, provider configuration code, auth dependencies or identity tables; that release changed no production provider settings. The owner confirmed these unchanged flows on 2026-11-13. Do not reopen them as blockers unless relevant source/configuration changes or contrary evidence appears. **Unknown:** acceptance of the new feature workflows; the owner said they need to review them.

**Fact — owner direction, 2026-11-24:** general audience, not child-directed; US-only launch; proposed minimum account age 18. Carry US-only / 18+ as product requirements. DMCA-specific work is deferred. **Planned, not implemented:** age eligibility across OTP and Google account creation, privacy contact/notice and account-data deletion/report handling. A checkbox alone is not a neutral COPPA age screen; intended market and eligibility policy do not establish legal clearance. [Scope, sources and acceptance](PRIVACY-READINESS.md#owner-scope-and-next-safeguards--2026-11-24).

**Fact:** a narrowly authorized import added five original private mock projects to the owner's existing OTP account, preserving its existing project and auth records. Historical dates remain intentional; no tasks/expenses/inventory were invented in production. [Importer and provenance](DEMO.md). Keep other fixtures/test accounts in disposable environments.

## Verification and release constraints

- **Fact — recorded source evidence:** UI acceptance passed 48 Node and 71 Chromium tests, 99.03% V8 source lines and 96.82% branches; report `coverage/run-hZPyCD/report/`. Lint/build passed. A real local OTP/API/PostgreSQL workflow verified dates → Schedule → persisted report export. Independent review found a long-name mobile overflow; the fix and permanent regression passed. No application suite was rerun merely for this documentation handoff.
- **Fact — recorded hosted state:** all seven migrations were applied for `935418c`; runtime expense-table DML privileges and default owner grants were verified. Recheck migration state privately when releasing; do not assume an old temporary connection or environment file is a valid target.
- **Fact:** archived content is read-only except access-reduction controls and permitted invitation acceptance. Once archives exist, rollback must use archive-aware authorization; old pre-archive `2ce81ed` is not a safe application rollback for those records.
- **Fact:** strict 100% line target remains open; current CI floor is 99%. Build/coverage percentages are not proof of hosted account isolation or human acceptance. [Commands](ENGINEERING.md).

## Next actions, in order

1. **Recommendation:** finish the scoped runtime dependency patch and current checks before UI promotion. Consolidation PR #5 is already merged; future branches start from updated `main`.
2. **Recommendation:** retire integration and feature branches only after current `main` CI passes and every latest local/remote tip is contained in `origin/main`, with clean worktree/open-PR checks and race-safe remote deletion. Recompute SHAs at execution time.
3. **Recommendation:** promote the reviewed UI as a separate release after dependency checks, using [the deployment runbook](DEPLOYMENT.md). Local workflow/visual checks passed; owner production feature acceptance remains distinct.
4. **Recommendation:** follow the general-audience, US-only / 18+ scope in [privacy/commercial readiness](PRIVACY-READINESS.md). Define the eligibility workflow and resolve operator/contact, actual retention/deletion facts and privacy-notice content before implementing policy-dependent behavior. Include server enforcement across OTP/Google and under-age report handling. DMCA-specific work is deferred per owner direction. No replay-consent, marketing unsubscribe or renewal UI fix was justified by the inspected implementation.
5. **Unknown product rules:** define first task-dependency type, who edits edges, what completion/reopening does, and whether prerequisites warn or block. Then implement one same-project edge slice with self/cross-project/cycle rejection and concurrent-write tests under the existing locking model. Independent calendar events, resource conflicts/reservations, report search/filtering, task-level inventory and further UX remain later slices. Do not silently select their persisted semantics.

## New-feature manual QA

- Project owner: edit details/status/priority and UTC dates; reload; open Schedule; clear endpoints; reject reversed ranges. Member/archived views must deny editing at the API as well as in UI.
- Tasks: CRUD, board/keyboard status moves, verified-member assignment, assigned-task-only member edits and hours, membership revocation, archived denial.
- Inventory: separate owner catalogs, quantity replacement/removal, stock shortfalls, demand changes for archive/completion; unauthorized caller denial.
- Reports: record expenses `12.34` + `0.66`, reload total `13.00`, reconcile CSV, formula/quote escaping, print to PDF; owner-only access and archived read-only behavior.
- Sharing: owner-controlled invites/membership, comments, explicit public fields, unpublish/revocation, archive exceptions; cancel deletion before confirming it on disposable data.
- UI: desktop/mobile/keyboard navigation, real dashboard metrics and links, empty/error/retry states, project filters, long valid names, comparison with the portfolio reference. Do not publish test captures as production-account evidence.

## Copy into a new chat

```text
Continue RepairVantage from /Users/interface/code/RepairVantage.
Use $dev-session. Read AGENTS.md, docs/HANDOFF.md,
docs/BRANCH-CONSOLIDATION.md and docs/PRIVACY-READINESS.md.
Verify current Git/PR/provider state before relying on snapshot SHAs.
OTP/Google/linking are owner-confirmed for the unchanged implementation.
Owner scope: general audience, US-only launch, 18+ account eligibility.
Eligibility is planned, not implemented; DMCA-specific work is deferred.
PR #5 consolidated main; do not reopen that consolidation. Verify the
runtime dependency fix, release and cleanup state before continuing.
Require existing-account acknowledgment; verified email is not age proof.
Do not infer deployment or branch-deletion permission solely from this
handoff. Preserve owner privacy, real dashboard
data and the portfolio design. Next product work needs dependency semantics
settled before implementation. Include docs, meaningful checks, dev-review,
semantic commit, staging groups, PR body/delta and manual QA in each slice.
```

## Initial handoff change record · 2026-11-18

Suggested commit: `docs(handoff): plan main consolidation and privacy readiness`.

```sh
git add README.md docs/HANDOFF.md docs/ROADMAP.md docs/ENGINEERING.md \
  docs/DEPLOYMENT.md docs/UI-REFERENCE.md docs/IMPLEMENTATION.md \
  docs/BRANCH-CONSOLIDATION.md docs/MAIN-CONSOLIDATION-PR.md \
  docs/PRIVACY-READINESS.md
```

Verification for this documentation change: 122 local Markdown targets exist; all five planned shell blocks pass `bash -n`. Plan commands were not executed. Independent app/Git/legal-source reviews found no remaining substantive issue after the guarded merge-command fix. Runtime tests were not rerun for documentation-only edits.

PR body: documentation-only fresh-chat handoff; verified PR #3 merge/ancestry and live-vs-merged state; prepared merge-commit consolidation/guarded pruning; source-backed six-claim audit and owner inputs. Verify Markdown paths, commands and current source/provider facts. No runtime/migration/provider/production changes. Use the repository PR template; record any later push's changed documentation/evidence as its delta.

## Audience clarification follow-up · 2026-11-24

Commit: `docs(privacy): record US-only adult account scope`.

```sh
git add docs/PRIVACY-READINESS.md docs/HANDOFF.md docs/ROADMAP.md \
  docs/MAIN-CONSOLIDATION-PR.md
```

PR delta: owner-reported general audience, US-only launch and proposed 18+ eligibility replace the previously unknown intended audience; DMCA-specific work is deferred. The next slice must distinguish an eligibility declaration from verified age and cover server rejection, OTP/Google paths, retry/bypass attempts and known under-age report handling. Operator/contact, privacy notice and actual retention/deletion facts remain open. No runtime or production changes. Manual review: check these scope decisions and the new-chat prompt; application acceptance is still future work.

Verification: `git diff --check` passed; all 46 local Markdown targets in the four changed documents exist; both shell blocks pass `bash -n` without executing their commands. Independent documentation review found no material issue; the FTC checkbox example was made specific and its application to an 18+ checkbox labeled as inference. No runtime suite was rerun for this documentation-only follow-up.
