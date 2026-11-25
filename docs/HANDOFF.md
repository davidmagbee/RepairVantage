# RepairVantage · current handoff

Updated 2026-11-24. Repository `/Users/interface/code/RepairVantage`. Start with AGENTS.md, ROADMAP.md and ENGINEERING.md; use dev-session/dev-review. Facts below are executed checks or attributed owner decisions; pending work is explicit.

## Git and production

- PR #4 merged at `5b513d9`. PR #5 consolidated integration into main at `ca8fe43` using a merge commit; PR #6 fixed the scoped Effect advisory at `678d25e`. Both PR/main Verify runs passed. Future feature PRs target main.
- Five contained local/remote branches were pruned after latest main CI, local/remote ancestry, open-PR/worktree checks and exact deletion leases: portfolio-ui, report-export-demo, handoff-main-consolidation, engineering-harness and runtime-audit-fix (all under dev/). No unique work was discarded. Current work is dev/account-eligibility, based on updated main `678d25e`.
- Restored UI is LIVE from `472cd93ff4338721d39dc8de52fa0700d6b71252`, deployment dpl_8V69mRY95LqEm3pi4GmgEMt3DixZ. It was staged/tested then promoted. Canonical assets index-Lwc0KQGF.js/index-Ba_5MxwD.css, readiness/provider checks and signed-out private denial passed. [Release evidence](DEPLOYMENT.md#release-2026-11-24--restored-ui).
- That release retains seven production migrations and unchanged auth. Existing owner-confirmed production OTP/Google/linking remain confirmed for that unchanged code; new eligibility changes require their own hosted acceptance. Vercel Git linkage remained absent at recheck. Source merges do not deploy through Verify.

## Current feature

Implemented, NOT deployed: neutral 18+ pre-auth screening for all OTP/Google entry points; current-version acknowledgment for both new/existing accounts before private API/UI; immutable-through-acceptance first timestamp/exact statement/version/source; trusted OAuth state; persistent authenticated under-age hold; public privacy notice/contact. Public Showcases, privacy and sign-out remain available. [Contract, rationale, expansion and QA](ACCOUNT-ELIGIBILITY.md).

Owner decisions: general audience, not child-directed; 18+ accounts; existing users must acknowledge. Verified email or owner familiarity must never backfill age acceptance. US-only is intended market, no IP block. Public service branding RepairVantage, approved contact repairvantageadmin@gmail.com. No LLC is claimed. DMCA work deferred. Provider processing/user-directed sharing are disclosed; do not say data never leaves the app.

New migrations 20261124163000_account_eligibility and20261124170000_account_eligibility_restriction were applied ONLY to disposable PostgreSQL. No production account/data write occurred for this feature. Before release, apply both privately and verify runtime table/column privileges. Once holds/acknowledgments are live, rollback must preserve both eligibility and archive authorization.

## Verification checkpoint

- Fresh UI baseline: 48 Node + 71 Chromium, 99.03% lines/96.82% branches, lint/build, built-package desktop/mobile visual checks. Captures were synthetic, not production-account evidence.
- Dependency patch: runtime audits zero, Prisma generation/build, unit/pathological matcher tests and PR/main CI passed. Scoped override rationale/removal condition in ENGINEERING.md.
- Eligibility functional run: 52 Node + 78 Chromium passed; 98.65% line coverage missed existing 99% gate. Review fixed an authenticated cookie-removal bypass by persisting an account hold. Added meaningful identity-failure, OAuth callback/direct-token, invalid-body, policy-change, checkbox-revocation and privacy-route regressions. Final expanded verification PASSED: 52 Node + 79 Chromium tests; 99.01% lines / 96.90% branches; client lint/build and server build passed. Report `coverage/run-rY6WKB/report/`. Application sources were unchanged after that run.
- Independent source review found the hold fix resolved the bypass. Local providers are mocked in OAuth integration tests; real hosted consent/linking for eligibility is not claimed.

## Next action

1. Inspect dev/account-eligibility PR/current HEAD and final verification output. Keep 99% floor; do not reuse earlier passes after source changes. Complete review of all tracked/new files and documentation links.
2. Review the feature and its public notice. Legal-identity requirements, provider log/backup retention and a tested full account-deletion workflow remain unresolved; public text makes no immediate-total-erasure promise. The owner intends deletion on request. Use the approved mailbox; do not send test messages automatically.
3. Release eligibility separately from the already-live UI only after migration/runtime privileges and hosted OTP/Google/existing-session/hold acceptance. Keep production private data out of fixtures/captures.
4. Continue task dependencies only after defining edge type, editors, completion/reopening and warn/block semantics. Other roadmap features remain later slices.

## Commit, staging, PR and QA

Feature commit: `feat(auth): require versioned adult eligibility acknowledgment`.

One feature group: client eligibility/privacy/API-proxy source and browser tests; server policy/identity/HTTP source, schema/two migrations and API tests; deployment wrapper/public route; affected README and docs including ACCOUNT-ELIGIBILITY.md. Stage explicit paths, inspect git diff --cached and include documentation in the same commit. PR uses .github/pull_request_template.md; record later verification/release deltas without claiming production eligibility.

Manual QA: [account eligibility](ACCOUNT-ELIGIBILITY.md#manual-qa), [UI reference](UI-REFERENCE.md), [release QA](DEPLOYMENT.md#release-qa). Existing/new accounts, direct API bypass, current/stale policy, cookie removal with durable hold, sign-out, public notice/Showcase, private owner/member/archive workflows and real providers all have distinct acceptance boundaries.

## New chat prompt

Continue /Users/interface/code/RepairVantage using dev-session. Read AGENTS.md, this handoff, ACCOUNT-ELIGIBILITY.md and ROADMAP.md. Main consolidation/cleanup and UI production release are complete. Inspect dev/account-eligibility PR/checks; eligibility is implemented but not deployed. Require existing-account acknowledgment; self-declaration is not age proof. US-only is intended market, no IP filter; expansion steps are documented. Keep owner privacy and real dashboard data. Finish final checks/review, then release only within authorized scope with both migrations, privileges and new hosted auth acceptance. Do not reopen old unchanged-auth blockers or recreate consolidation PRs. Do not assume local tasks keep running when the computer sleeps.
