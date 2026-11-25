# RepairVantage · current handoff

Updated 2026-11-25. Repository `/Users/interface/code/RepairVantage`. Start with AGENTS.md, ROADMAP.md and ENGINEERING.md; use dev-session/dev-review. Facts below are executed checks or attributed owner decisions; pending work is explicit.

## Git and production

- PR #4 merged at `5b513d9`. PR #5 consolidated integration into main at `ca8fe43` using a merge commit; PR #6 fixed the scoped Effect advisory at `678d25e`. Both PR/main Verify runs passed. Future feature PRs target main.
- Five contained local/remote branches were pruned after latest main CI, local/remote ancestry, open-PR/worktree checks and exact deletion leases: portfolio-ui, report-export-demo, handoff-main-consolidation, engineering-harness and runtime-audit-fix (all under dev/). No unique work was discarded. PR #7 subsequently merged at `f1cc1d0`; PR #8 merged its release documentation into `main` at `51ec71b`.
- Current development branch: `dev/local-time-project-layout`, based on `51ec71b`, with PR target `main`. Its timezone/Project Details work is not deployed. Local acceptance passed; owner UI acceptance, hosted CI/review and release remain. Inspect current Git/PR state before continuing.
- Production now serves tested eligibility source `ce177748accf67be699672e72c1739b5d23e206e`, whose tree equals main merge `f1cc1d024464d08b47230722983aec8810988633`. Deployment `dpl_CjSsbytY3cPDrYS8yKQjZAgVJCze` was staged/tested then promoted on 2026-11-25. Canonical assets `index-C75HHS4e.js` / `index-CE3blD3a.css` match the reviewed package. [Release evidence](DEPLOYMENT.md#release-2026-11-25--account-eligibility).
- All nine production migrations are applied. Acknowledgment table SELECT/INSERT/UPDATE and User restriction-column SELECT/UPDATE were verified for repairvantage_app. No acceptance backfill, test account or account hold was created by this release.
- The owner approved local UI testing before merging. Existing historical OTP/Google acceptance applies to the previous unchanged implementation; this new auth workflow still needs hosted provider/existing-session acceptance. Provider settings were not changed.

## Current feature

Implemented on the current development branch, not deployed:

- Browser time-zone preference: valid saved choice, otherwise device IANA-zone detection, with `America/New_York` fallback. Manual choice and **Use device time zone** persist in this browser, without account synchronization or server location inference.
- Consistent project/task/dashboard/comment/invitation/report display in the selected zone. Project/task editors freeze their zone at opening, reject skipped local times, require first/second choice for repeated local times, and preserve unchanged precision and saved occurrence. Stored instants and CSV UTC timestamps remain unchanged.
- Schedule date inputs are inclusive local dates, converted to UTC `[from, to)` day boundaries. Civil-date arithmetic drives calendar/timeline placement. The optional API `timeZone` accepts at most 93 local dates; omitted/null retains the original 93-elapsed-day limit. No Prisma migration or server configuration change.
- Project Details uses side-by-side Schedule/settings on wide screens and collapses on narrow screens. Status/priority saves and owner/member/archive access rules remain intact. Authentication/eligibility implementation and provider settings are outside this slice.
- PR #9 also adds a standalone local SVG favicon: black house/wrench, orange-handled screwdriver, no window, with a white backplate for browser-tab contrast. No icon-library dependency is introduced. Favicon verification is recorded separately from the timezone test baseline below; production remains unchanged.

[Usage](../client/README.md#time-zone-preference) · [API contract](../server/README.md#schedule-time-zone-contract) · [Design/manual QA](UI-REFERENCE.md#local-time-and-project-overview--current-development).

## Deployed eligibility baseline

Neutral 18+ pre-auth screening for all OTP/Google entry points; current-version acknowledgment for both new/existing accounts before private API/UI; immutable-through-acceptance first timestamp/exact statement/version/source; trusted OAuth state; persistent authenticated under-age hold; public privacy notice/contact. Public Showcases, privacy and sign-out remain available. [Contract, rationale, expansion and QA](ACCOUNT-ELIGIBILITY.md).

Owner decisions: general audience, not child-directed; 18+ accounts; existing users must acknowledge. Verified email or owner familiarity must never backfill age acceptance. US-only is intended market, no IP block. Public service branding RepairVantage, approved contact repairvantageadmin@gmail.com. No LLC is claimed. DMCA work deferred. Provider processing/user-directed sharing are disclosed; do not say data never leaves the app.

Migrations `20261124163000_account_eligibility` and `20261124170000_account_eligibility_restriction` passed disposable testing and are now applied to production. Rollback must preserve both eligibility and archive authorization; old UI source `472cd93` is unsafe once live holds/acknowledgments exist.

## Verification checkpoint

- Favicon follow-up: client production build passed; built HTML links `/favicon.svg`, which returns HTTP 200 as `image/svg+xml` (1,122 bytes). Inspected 16px/32px renders on light/dark backgrounds and an enlarged mark. [Preview](design/favicon-preview.png). Static SVG contains no script, font or external dependency. This asset/HTML-only change does not reuse the older full-suite result as new coverage evidence; current PR checks and owner visual acceptance remain required.
- Current timezone/layout feature: client lint passed with zero warnings; client/server builds passed. Twenty targeted browser tests passed, then the full disposable-PostgreSQL acceptance command `node scripts/coverage.mjs --minimum-lines=99` passed 52 Node + 92 Chromium tests with 99.02% lines / 96.93% branches. Report: `coverage/run-Kfe3KN/report/`. Independent source reviews found no actionable defect. Synthetic 1440px desktop and 375px mobile card captures were inspected without horizontal overflow, console errors or page errors. [Desktop](design/project-overview-desktop.png) · [Mobile](design/project-overview-mobile.png). Live owner acceptance remains pending.
- Material tradeoff: the client build emits a 656.71 kB entry script (196.53 kB gzip) and Vite's >500 kB chunk warning. Temporal-backed helpers supply DST-safe conversion but load through the global provider. Measure route/dependency splitting as a follow-up; do not hide the warning by raising the threshold. [Verification guidance](ENGINEERING.md#time-zone-and-project-details-slice).
- Fresh UI baseline: 48 Node + 71 Chromium, 99.03% lines/96.82% branches, lint/build, built-package desktop/mobile visual checks. Captures were synthetic, not production-account evidence.
- Dependency patch: runtime audits zero, Prisma generation/build, unit/pathological matcher tests and PR/main CI passed. Scoped override rationale/removal condition in ENGINEERING.md.
- Eligibility functional run: 52 Node + 78 Chromium passed; 98.65% line coverage missed existing 99% gate. Review fixed an authenticated cookie-removal bypass by persisting an account hold. Added meaningful identity-failure, OAuth callback/direct-token, invalid-body, policy-change, checkbox-revocation and privacy-route regressions. Final expanded verification PASSED: 52 Node + 79 Chromium tests; 99.01% lines / 96.90% branches; client lint/build and server build passed. Report `coverage/run-rY6WKB/report/`. Application sources were unchanged after that run; both PR #7 and merged-main Verify passed.
- Independent source review found the hold fix resolved the bypass. Local providers are mocked in OAuth integration tests; real hosted consent/linking for eligibility is not claimed.

## Next action

1. Review the [desktop/mobile and DST checklist](UI-REFERENCE.md#local-time-and-project-overview--current-development) with the owner before release. Automated acceptance and source review passed; synthetic visual checks do not establish live account acceptance.
2. Keep source, tests and affected documentation together on the feature branch; PR target is `main`. Require current hosted CI/review and inspect its status before acting. Record the merged source before separately preparing an authorized production promotion. No migration is required for this slice; use the [deployment runbook](DEPLOYMENT.md) and preserve current eligibility/archive restrictions on rollback.
3. Keep historical hosted acceptance separate: the eligibility release still needs production OTP/Google/linking and existing-session acknowledgment walkthroughs. Readiness, public privacy/age UI, signed-out private denial, pre-screen OTP rejection, anonymous age rejection/retry denial and signed-out acknowledgment denial passed production smoke checks. No recipient email was submitted during automated smoke checks. Do not repeat eligibility migrations or create fixture users/false age holds in production.
4. Legal-identity requirements, provider log/backup retention and a tested full account-deletion workflow remain unresolved; public text makes no immediate-total-erasure promise. Use the approved privacy mailbox; do not send test messages automatically.
5. Continue task dependencies only after defining edge type, editors, completion/reopening and warn/block semantics. Other roadmap features remain later slices.

## Commit, staging, PR and QA

Expected current feature commit message: `feat(scheduling): use local time zones and widen project overview`. Feature source is identified by `dev/local-time-project-layout`, base `51ec71b`, PR target `main`; inspect current Git/PR state for the exact tip. Historical deployed feature: `ce17774` — `feat(auth): require versioned adult eligibility acknowledgment`; release-record commit `5ae7c93` was merged through PR #8.

Favicon follow-up commit: `feat(branding): add house and repair-tools SVG favicon`. Stage the SVG, HTML reference, preview and affected README/design/roadmap/handoff documentation together. PR #9's delta must list the favicon, fresh build/asset checks, reference-aligned house/tool composition, and unchanged release state. Manual QA: reload a fresh local browser tab, inspect the tab icon and open `/favicon.svg`; repeat after release.

One current feature group: client timezone utility/context/controls, date formatting/editing, responsive detail layout, Temporal dependency and tests; server Schedule resolver/schema/API tests; root/client/server READMEs and ROADMAP, IMPLEMENTATION, UI-REFERENCE, ENGINEERING, HANDOFF. Stage explicit paths, inspect `git diff --cached` and include affected documentation in the same commit. PR uses `.github/pull_request_template.md`; record later behavior/verification/release deltas. No new migration or deployed-source claim belongs in this feature commit.

Current manual QA: [timezone and project overview](UI-REFERENCE.md#local-time-and-project-overview--current-development). Historical outstanding acceptance: [account eligibility](ACCOUNT-ELIGIBILITY.md#manual-qa) and [release QA](DEPLOYMENT.md#release-qa). Local mocked-provider or timezone tests do not prove hosted authentication acceptance.

## New chat prompt

Continue /Users/interface/code/RepairVantage using dev-session. Read AGENTS.md, this handoff, ROADMAP.md and ENGINEERING.md. Work on dev/local-time-project-layout, based on main at 51ec71b; inspect current Git state. Local acceptance passed 52 Node + 92 Chromium with 99.02% lines / 96.93% branches, lint/build, independent reviews and synthetic desktop/mobile checks. Complete owner acceptance and PR/CI before another roadmap feature. Preserve editor-zone freezing, DST gap/fold handling, untouched precision, UTC storage/CSV and optional Schedule API compatibility. Record the client chunk warning and measure splitting later. This feature is not deployed and needs no migration. PRs target main; deployment is separate. Production remains eligibility source ce17774 with all nine migrations/privileges complete. Keep existing-account acknowledgment, durable holds, archive restrictions and real owner data. Hosted OTP/Google and existing-session eligibility acceptance remain separate from signed-out smoke evidence. Do not assume local tasks keep running when the computer sleeps.
