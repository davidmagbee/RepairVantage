# RepairVantage · current handoff

Updated 2026-11-25. Repository `/Users/interface/code/RepairVantage`. Start with AGENTS.md, ROADMAP.md and ENGINEERING.md; use dev-session/dev-review. Executed evidence and remaining acceptance are separated below.

## Git and production

- [PR #9](https://github.com/davidmagbee/RepairVantage/pull/9) merged at `c970593327df66edd500f885b8c2b27be9f24435`. The exact merged archive was packaged; promotion was requested on 2026-11-25 at 17:54:16 UTC / 12:54:16 Eastern and canonically verified after propagation. Its tree `8aad51872330b6bc3ffa86aa120a14cf445808cb` equals reviewed feature head `fe3b87d9b5ed8fefc1b2b652af43e8b8895973ce`.
- Production is deployment `dpl_B82wkdTojJibZQ5PW71Ev7AarjCh` at [the canonical origin](https://repairvantage.davidmagbee.com). Canonical HTML, `index-s5vrD5tl.js`, `index-CdgCCkDM.css` and `/favicon.svg` match the reviewed package byte for byte. Reviewed archive/tree and byte checks establish release identity. [Release evidence](DEPLOYMENT.md#release-2026-11-25--local-time-layout-and-favicon).
- Current documentation branch: `dev/local-time-release-record`, based on merged source `c970593`, PR target `main`. Application source was not changed for the release record. Inspect current Git/PR state before continuing. The merged feature branch `dev/local-time-project-layout` is retained; no branch was pruned by this release.
- Main consolidation/cleanup is complete: PR #5 merged at `ca8fe43`; five contained historical branches were pruned after CI/ancestry/worktree/PR checks. PR #6 merged the scoped Effect patch at `678d25e`; PR #7 merged eligibility at `f1cc1d0`; PR #8 merged its release record at `51ec71b`. Future feature branches start from updated `main`. [Guarded cleanup](BRANCH-CONSOLIDATION.md).

## Released behavior

- Browser time-zone preference: valid saved choice, otherwise device IANA-zone detection with `America/New_York` fallback. Manual choice and **Use device time zone** persist in this browser, without account synchronization or server location inference.
- Project/task/dashboard/comment/invitation/report dates use the selected zone. Project/task editors freeze their zone when opened, reject skipped local times and require first/second occurrence for repeated times. Unchanged values retain exact precision and saved occurrence. Stored instants and CSV UTC timestamps remain unchanged.
- Schedule uses inclusive local form dates and UTC `[from, to)` day boundaries. Civil-date arithmetic drives placement. Optional API `timeZone` accepts at most 93 local dates; omitted/null preserves the original 93-elapsed-day cap.
- Project Details places Schedule/settings beside each other on wide screens and collapses on narrow screens. Independent status/priority saves and owner/member/archive controls remain. The local SVG favicon pairs a black house/wrench with an orange-handled screwdriver and white backplate.

[Usage](../client/README.md#time-zone-preference) · [API contract](../server/README.md#schedule-time-zone-contract) · [Owner QA](UI-REFERENCE.md#local-time-and-project-overview).

## Verification checkpoint

- [PR-head Verify](https://github.com/davidmagbee/RepairVantage/actions/runs/45668078312) passed. [Merged-main Verify](https://github.com/davidmagbee/RepairVantage/actions/runs/45668909913) completed successfully at 17:53:41 UTC; all steps in job `139398511657` passed. Its logs confirm 52 Node + 92 Chromium, 99.02% lines / 96.93% branches. Local pre-release coverage report: `coverage/run-Kfe3KN/report/`. Client lint had zero warnings; client/server builds and fresh runtime audits passed, with zero runtime vulnerabilities reported.
- Independent source reviews found no actionable defect. Synthetic 1440px/375px captures were inspected without horizontal overflow, console errors or page errors. [Desktop](design/project-overview-desktop.png) · [Mobile](design/project-overview-mobile.png). These are local fixtures, not production-account acceptance.
- Favicon build/asset checks passed; 16px/32px light/dark renders and the enlarged mark were inspected. [Preview](design/favicon-preview.png). Canonical SVG is 1,122 bytes, `image/svg+xml`, with SHA-256 `ddd8d1b4d656750ba5401390600c29ad259ad02d20129bbae0c934a1b287032e`.
- Protected staging and canonical release checks passed readiness/provider discovery, nested Schedule shell and assets. Canonical health was healthy, readiness ready, both providers advertised available, and anonymous eligibility returned policy `adult-2026-11-24` / age 18 with no screening, block or acknowledgment. Signed-out GraphQL `me` returned `UNAUTHENTICATED` with no private data. Public login/privacy loaded; browser inspection showed the age form and favicon link without browser error logs.
- A deployment-scoped error/fatal log query covering the preceding 15 minutes returned no matching groups. This is bounded evidence, not proof of no errors. Release checks did not initiate OTP, Google consent or an age declaration/hold, create fixture accounts, or perform account/project mutations. Runtime auth/security bookkeeping was not audited for incidental writes.
- Material tradeoff: the client build emits a 656.71 kB entry script / 196.53 kB gzip and Vite's >500 kB warning. Temporal helpers load through the global provider. Measure route/dependency splitting later; do not hide the warning by raising the threshold.

## Eligibility and rollback boundaries

The prior eligibility release deployed neutral 18+ pre-auth screening, current-version acknowledgment for existing/new accounts, trusted OAuth state and persistent authenticated under-age holds. Public Showcases, privacy and sign-out remain available. It applied both additive eligibility migrations and verified runtime acknowledgment/restriction privileges, bringing production to nine applied migrations. No migration, account/project mutation or auth/provider configuration change was performed by the timezone release. [Prior release evidence](DEPLOYMENT.md#release-2026-11-25--account-eligibility).

Historical eligibility acceptance: 52 Node + 79 Chromium, 99.01% lines / 96.90% branches (`coverage/run-rY6WKB/report/`), lint/build and PR/main CI passed. The authenticated cookie-removal bypass was fixed with durable account holds. Real hosted OTP/Google consent/linking and existing-session acknowledgment remain owner acceptance; provider availability and synthetic tests do not establish their completion.

Owner decisions: general audience, not child-directed; 18+ accounts; existing users acknowledge. Never backfill acceptance from verified email or owner familiarity. US-only is intended market, no IP block. Public branding is RepairVantage; privacy/deletion contact is repairvantageadmin@gmail.com. No LLC is claimed. DMCA work is deferred. Disclose provider processing/user-directed sharing; do not claim data never leaves the app. [Contract and expansion](ACCOUNT-ELIGIBILITY.md).

Previous deployment `dpl_CjSsbytY3cPDrYS8yKQjZAgVJCze` / source `ce17774` remains an eligibility-aware, archive-aware rollback target. Older UI-only deployments ignore holds/acknowledgments and are unsafe once those records exist. Do not drop audit/restriction records during rollback or rerun migrations solely from this handoff.

## Next action

1. Complete authenticated owner [timezone/layout/favicon QA](UI-REFERENCE.md#local-time-and-project-overview) at the canonical origin. Check desktop/mobile, zone persistence/reset, open-editor freezing, DST gap/fold handling, unchanged precision, Schedule range placement, owner/member/archive controls, CSV/print and the tab icon. Keep production records private; do not create fixtures or false age holds for hosted testing.
2. Keep hosted OTP/Google/linking and existing-session eligibility acceptance separate. This release changed no auth/provider configuration and did not initiate provider flows. Do not claim historical unchanged-auth acceptance proves the later eligibility workflow.
3. Review/merge the documentation-only release record against `main`; it does not require redeployment. Future features start from updated `main`. Prune merged branches only after latest-tip containment and worktree/open-PR checks.
4. Legal-identity requirements, provider log/backup retention and a tested full account-deletion workflow remain unresolved. Use the approved privacy mailbox; do not send test messages automatically.
5. Before task dependencies, define edge type, editors, completion/reopening and warn/block semantics. Keep bundle splitting and other roadmap features as separate slices.

## Commit, staging, PR and QA

Released feature commits: `5166d86` — `feat(scheduling): use local time zones and widen project overview`; `fe3b87d` — `feat(branding): add house and repair-tools SVG favicon`. PR #9 merged both at `c970593` and production now serves that merged source.

Expected release-record commit: `docs(release): record local-time and favicon deployment`. One documentation group: root/client/server READMEs, DEPLOYMENT, HANDOFF, ROADMAP, UI-REFERENCE, IMPLEMENTATION and ENGINEERING. Stage explicit paths and inspect `git diff --cached`; use `.github/pull_request_template.md`. Record later documentation/verification deltas without implying another deployment or newly completed hosted authentication.

## New chat prompt

Continue /Users/interface/code/RepairVantage using dev-session. Read AGENTS.md, HANDOFF.md, ROADMAP.md and ENGINEERING.md. PR #9 merged at c970593 and that exact source is deployed as dpl_B82wkdTojJibZQ5PW71Ev7AarjCh. PR/main CI, reviewed-package/asset checks, canonical readiness/public routes and signed-out private denial passed. Current branch dev/local-time-release-record contains release documentation only; inspect Git/PR state before acting. No redeployment/migration is needed merely to merge that record. Complete owner authenticated timezone/layout/favicon QA and separately retain hosted eligibility/provider acceptance as outstanding. Preserve editor-zone freezing, DST gap/fold handling, precision, UTC storage/export, optional Schedule compatibility, eligibility holds, archive rules and real owner data. Nine migrations were applied by the earlier eligibility release; ce17774 remains a safe rollback source. Start later features from updated main. Do not assume local processes keep running when the computer sleeps.
