# RepairVantage · current handoff

Updated 2026-11-25. Repository `/Users/interface/code/RepairVantage`. Start with AGENTS.md, ROADMAP.md and ENGINEERING.md; use dev-session/dev-review. Facts below are executed checks or attributed owner decisions; pending work is explicit.

## Git and production

- PR #4 merged at `5b513d9`. PR #5 consolidated integration into main at `ca8fe43` using a merge commit; PR #6 fixed the scoped Effect advisory at `678d25e`. Both PR/main Verify runs passed. Future feature PRs target main.
- Five contained local/remote branches were pruned after latest main CI, local/remote ancestry, open-PR/worktree checks and exact deletion leases: portfolio-ui, report-export-demo, handoff-main-consolidation, engineering-harness and runtime-audit-fix (all under dev/). No unique work was discarded. PR #7 subsequently merged at `f1cc1d0`; release documentation is on dev/eligibility-release-record, based on that main commit.
- Production now serves tested eligibility source `ce177748accf67be699672e72c1739b5d23e206e`, whose tree equals main merge `f1cc1d024464d08b47230722983aec8810988633`. Deployment `dpl_CjSsbytY3cPDrYS8yKQjZAgVJCze` was staged/tested then promoted on 2026-11-25. Canonical assets `index-C75HHS4e.js` / `index-CE3blD3a.css` match the reviewed package. [Release evidence](DEPLOYMENT.md#release-2026-11-25--account-eligibility).
- All nine production migrations are applied. Acknowledgment table SELECT/INSERT/UPDATE and User restriction-column SELECT/UPDATE were verified for repairvantage_app. No acceptance backfill, test account or account hold was created by this release.
- The owner approved local UI testing before merging. Existing historical OTP/Google acceptance applies to the previous unchanged implementation; this new auth workflow still needs hosted provider/existing-session acceptance. Provider settings were not changed.

## Current feature

Implemented and deployed: neutral 18+ pre-auth screening for all OTP/Google entry points; current-version acknowledgment for both new/existing accounts before private API/UI; immutable-through-acceptance first timestamp/exact statement/version/source; trusted OAuth state; persistent authenticated under-age hold; public privacy notice/contact. Public Showcases, privacy and sign-out remain available. [Contract, rationale, expansion and QA](ACCOUNT-ELIGIBILITY.md).

Owner decisions: general audience, not child-directed; 18+ accounts; existing users must acknowledge. Verified email or owner familiarity must never backfill age acceptance. US-only is intended market, no IP block. Public service branding RepairVantage, approved contact repairvantageadmin@gmail.com. No LLC is claimed. DMCA work deferred. Provider processing/user-directed sharing are disclosed; do not say data never leaves the app.

Migrations `20261124163000_account_eligibility` and `20261124170000_account_eligibility_restriction` passed disposable testing and are now applied to production. Rollback must preserve both eligibility and archive authorization; old UI source `472cd93` is unsafe once live holds/acknowledgments exist.

## Verification checkpoint

- Fresh UI baseline: 48 Node + 71 Chromium, 99.03% lines/96.82% branches, lint/build, built-package desktop/mobile visual checks. Captures were synthetic, not production-account evidence.
- Dependency patch: runtime audits zero, Prisma generation/build, unit/pathological matcher tests and PR/main CI passed. Scoped override rationale/removal condition in ENGINEERING.md.
- Eligibility functional run: 52 Node + 78 Chromium passed; 98.65% line coverage missed existing 99% gate. Review fixed an authenticated cookie-removal bypass by persisting an account hold. Added meaningful identity-failure, OAuth callback/direct-token, invalid-body, policy-change, checkbox-revocation and privacy-route regressions. Final expanded verification PASSED: 52 Node + 79 Chromium tests; 99.01% lines / 96.90% branches; client lint/build and server build passed. Report `coverage/run-rY6WKB/report/`. Application sources were unchanged after that run; both PR #7 and merged-main Verify passed.
- Independent source review found the hold fix resolved the bypass. Local providers are mocked in OAuth integration tests; real hosted consent/linking for eligibility is not claimed.

## Next action

1. Complete the new production OTP/Google/linking and existing-session acknowledgment walkthrough. Readiness, public privacy/age UI, signed-out private denial, pre-screen OTP rejection, anonymous age rejection/retry denial and signed-out acknowledgment denial passed production smoke checks. No recipient email was submitted during automated smoke checks.
2. Review the feature and its public notice. Legal-identity requirements, provider log/backup retention and a tested full account-deletion workflow remain unresolved; public text makes no immediate-total-erasure promise. The owner intends deletion on request. Use the approved mailbox; do not send test messages automatically.
3. Eligibility is already deployed; do not repeat the migrations or redeploy solely from this handoff. Preserve production privacy and do not create fixture users or false age holds for hosted tests. Current release error/fatal query over 15 minutes returned no matching groups; this is bounded evidence, not proof of no errors.
4. Continue task dependencies only after defining edge type, editors, completion/reopening and warn/block semantics. Other roadmap features remain later slices.

## Commit, staging, PR and QA

Feature commit: `ce17774` — `feat(auth): require versioned adult eligibility acknowledgment`. Release-record commit: `docs(release): record production eligibility deployment` (documentation only).

One feature group: client eligibility/privacy/API-proxy source and browser tests; server policy/identity/HTTP source, schema/two migrations and API tests; deployment wrapper/public route; affected README and docs including ACCOUNT-ELIGIBILITY.md. Stage explicit paths, inspect git diff --cached and include documentation in the same commit. PR uses .github/pull_request_template.md; record later verification/release deltas without claiming unverified hosted-provider acceptance.

Manual QA: [account eligibility](ACCOUNT-ELIGIBILITY.md#manual-qa), [UI reference](UI-REFERENCE.md), [release QA](DEPLOYMENT.md#release-qa). Existing/new accounts, direct API bypass, current/stale policy, cookie removal with durable hold, sign-out, public notice/Showcase, private owner/member/archive workflows and real providers all have distinct acceptance boundaries.

## New chat prompt

Continue /Users/interface/code/RepairVantage using dev-session. Read AGENTS.md, this handoff, ACCOUNT-ELIGIBILITY.md and ROADMAP.md. Main consolidation/cleanup and UI production release are complete. PR #7 is merged and eligibility is deployed; inspect the Nov25 release record and current provider state before further action. Require existing-account acknowledgment; self-declaration is not age proof. US-only is intended market, no IP filter; expansion steps are documented. Keep owner privacy and real dashboard data. Next verify hosted OTP/Google and existing-account acknowledgment; both migrations/privileges are already complete. Do not claim those live authenticated flows passed from signed-out smoke checks. Do not reopen old unchanged-auth blockers or recreate consolidation PRs. Do not assume local tasks keep running when the computer sleeps.
