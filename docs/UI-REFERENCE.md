# Portfolio UI reference

The owner identified the RepairVantage image in their portfolio as the intended visual baseline. The checked-in [reference screenshot](design/portfolio-dashboard.png) is the original prototype capture from `portfolio-modern/public/projects/repairvantage.png`; it is a design reference, not current application data.

## Merge and release state

[PR #3](https://github.com/davidmagbee/RepairVantage/pull/3) merged into integration at `5d46f84`; PR #5 subsequently consolidated `main`. The restored UI was deployed on 2026-11-24 from `472cd93`, including PR #6's scoped dependency patch. Fresh built-package desktop/mobile checks and 48 Node / 71 Chromium baseline tests passed. Captures remain synthetic, not production-account evidence. [Release evidence](DEPLOYMENT.md#release-2026-11-24--restored-ui).

## Restoration scope

`dev/portfolio-ui` restores the indigo workspace navigation, three colored summary cards, completion progress, two-column overview panels, status breakdown, and a wider light workspace. Project cards regain status colors and clear hierarchy, with search and status filters. Existing details, tasks, inventory, schedule, and reports use the shared form, table, panel, and button styling.

The new dashboard is at `/projects/dashboard`. Existing project and sign-in destinations remain unchanged. Dashboard statistics use only the verified account's owned, unarchived projects. Active means Planned, In progress, or On hold, matching inventory-demand semantics. Completed is the completed count; completion rate divides completed by all unarchived owned projects, including Cancelled. Shared projects remain outside owner totals. The upcoming panel shows at most five unfinished task deadlines in the next seven days from active owned projects. Dates use the selected display zone after the local-time refinement below shipped on 2026-11-25.

The original screenshot's activity feed and numbers were prototype fixtures. The restored view uses actual counts and recent project `updatedAt` values, labeled **Recent project updates**. It does not claim a historical activity log or create production fixtures. Recent updates are limited to five projects and ordered by saved update time, with stable ID ties.

## Verification and release boundary

Use the disposable PostgreSQL and browser commands in [Engineering](ENGINEERING.md). Dashboard API tests exercise ownership, shared-reader exclusion, archive filtering, terminal-project/task exclusion, date windows, and stable ordering. Browser tests exercise metrics, links, retry/empty states, project filters, current navigation, and narrow layouts. Desktop/mobile screenshots were inspected against the reference. The full local run passed 48 Node and 71 Chromium tests, with 99.03% source lines and 96.82% branches (`coverage/run-hZPyCD/report/`). A valid-long-name mobile overflow was reproduced, fixed, and covered by a permanent regression.

This UI restoration followed foundation release `935418c`. The owner confirmed existing OTP, Google consent, and linking for that historical unchanged-auth implementation. The later eligibility release changed the entry/acknowledgment workflow; its hosted-provider acceptance remains separate. [Current release boundary](HANDOFF.md).

<a id="local-time-and-project-overview--current-development"></a>

## Local time and project overview

PR #9 merged at `c970593` and was deployed on 2026-11-25 after PR/main CI passed. The owner's supplied Project Details screenshot identified two problems: UTC dates required conversion and vertical controls left most of the wide card empty. [Release evidence](DEPLOYMENT.md#release-2026-11-25--local-time-layout-and-favicon).

The workspace **Time zone** selector detects the device zone with Eastern fallback and a browser-persisted manual choice. Project/task dates and other workspace timestamps use that zone. Open editors retain their displayed editing zone until closed. UTC storage and report CSV timestamps remain unchanged. [Usage and DST behavior](../client/README.md#time-zone-preference).

The overview keeps title/description and status/priority together at the top. Schedule and Project settings sit beside each other on wide screens; settings keep independent saves. Edit details, report and archive actions share the bottom area. The grid collapses on narrow screens, while members and archived projects retain their existing access controls. This is a layout refinement; new dependencies, events and reporting features remain outside the slice.

Authenticated owner acceptance remains:

1. Review a wide desktop and narrow mobile Project Details view against the supplied screenshot. Check long names/descriptions/dates, keyboard focus and horizontal overflow; open both date/detail editors.
2. Select Eastern and Pacific zones. Check project dates, task dates, dashboard, comments, invitation expiry, expense dates and Schedule change consistently. Reload to verify the browser preference; use **Use device time zone** to restore detection.
3. Open a date/task editor, change the global zone, then save. Confirm its displayed editing zone and saved instant stay consistent; cancel/reopen adopts the new zone. Leave a seconds-bearing repeated-hour deadline untouched while editing another field; verify no timestamp mutation.
4. In Eastern, reject `2026-03-08 02:30`; for `2026-11-01 01:30`, choose each occurrence and verify the distinct instant after reload. Test empty fields, reversed project dates, failed-save retry and cancellation.
5. Exercise Schedule across spring/autumn transitions, including a 93-calendar-date autumn range; reject a 94-date range. Check first visible calendar placement, full timeline span and cross-zone date boundaries.
6. Repeat member and archived-project read-only views; compare CSV UTC timestamps and totals before/after changing the display zone. Review browser print output.

Current-feature local acceptance passed: 52 Node + 92 Chromium tests, 99.02% lines / 96.93% branches, client lint/build and server build. Independent reviews found no actionable defect. Synthetic 1440px desktop and 375px mobile card captures were inspected without horizontal overflow, console errors or page errors. [Desktop overview](design/project-overview-desktop.png) · [Mobile overview](design/project-overview-mobile.png). These show local fixtures, not production records. Owner acceptance remains pending. Historical restoration captures below are not evidence for this refinement. [Current evidence](HANDOFF.md#verification-checkpoint).

## Repair-tools favicon

The owner-supplied icon reference sets the favicon direction: a bold black house paired with a separate wrench and orange-handled screwdriver, with the window omitted. [Standalone SVG](../client/public/favicon.svg) is linked by the HTML entry point and included in Vite's public assets. Shaped wrench jaws and a straight screwdriver blade retain distinct tool silhouettes. The white rounded backplate maintains contrast on light/dark browser chrome. [Inspected 16px/32px and enlarged preview](design/favicon-preview.png). The favicon shipped with PR #9 on 2026-11-25; canonical SVG bytes, HTTP/MIME and the public login page's favicon link were checked against the reviewed package. Owner tab-icon visual acceptance remains separate.

## Review captures

These captures use synthetic local test responses and show the implemented design, not the owner's production account. No production data or credentials appear in them.

- [Desktop dashboard](design/dashboard-desktop.png)
- [Mobile dashboard](design/dashboard-mobile.png)
