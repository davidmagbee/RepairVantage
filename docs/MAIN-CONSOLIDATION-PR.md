<!-- Historical body: consolidation completed through PR #5 on 2026-11-24 at ca8fe43. Do not create a duplicate PR. -->

## Change

Make `main` the current development source of truth by merging the reviewed `dev/engineering-harness` history with a merge commit. This brings verified-session projects, sharing/Showcase, archive/tasks/assignment, owner inventory, UTC scheduling/date editing, USD reporting/export, and the portfolio-reference UI into the branch already designated as default.

```text
handoff documentation → integration → main → future dev/<feature> PRs
```

Do not merge the already-contained feature branches separately or squash/rebase this consolidation. Preserve ancestry for subsequent cleanup checks.

## Verification

- PR #3 merged at `5d46f84`; its UI head `039ae0b` passed Verify: https://github.com/davidmagbee/RepairVantage/actions/runs/43487681054.
- Recorded UI acceptance: 48 Node + 71 Chromium tests; 99.03% source lines and 96.82% branches. This is historical evidence for that source tree, not a new run of this consolidation PR.
- Require this PR's current Verify run before merging. Inspect the full current range, remote tips, worktrees, open PR dependencies, and deployment triggers.
- Production feature walkthroughs, operator/contact and retention/deletion facts remain open. Owner scope is general-audience, US-only / 18+; eligibility enforcement is planned, not implemented. DMCA-specific work is deferred. Existing unchanged OTP/Google/linking are owner-confirmed.

## Documentation

- [ ] Confirm the documentation checkpoint for the complete range being merged.

Review `docs/HANDOFF.md`, `docs/BRANCH-CONSOLIDATION.md`, `docs/PRIVACY-READINESS.md`, roadmap, implementation guide, deployment/engineering runbooks and root/client/server guidance. Replace snapshot SHAs if integration advanced after this draft.

## Release and data impact

This is a large source-branch consolidation, not a new schema design. Production already ran the seven checked-in migrations in the recorded feature release. Do not run historical SQL manually or assume a Git merge applies hosted migrations.

As of 2026-11-18, production remained on `935418c`; Vercel reported no Git connection, and the Verify workflow had no deployment step. Recheck external automation before merge. Deploy the UI separately using the reviewed-package runbook and an exact reviewed source commit. Keep rollback archive-aware.

Door: source changes can be reverted through review; hosted schema and data require separate recovery assessment. Blast radius: the default development branch. Branch deletion is a later step after exact ancestry/worktree/PR checks; no automatic branch deletion in this consolidation.
