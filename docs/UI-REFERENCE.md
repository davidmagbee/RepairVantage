# Portfolio UI reference

The owner identified the RepairVantage image in their portfolio as the intended visual baseline. The checked-in [reference screenshot](design/portfolio-dashboard.png) is the original prototype capture from `portfolio-modern/public/projects/repairvantage.png`; it is a design reference, not current application data.

## Restoration branch

`dev/portfolio-ui` restores the indigo workspace navigation, three colored summary cards, completion progress, two-column overview panels, status breakdown, and a wider light workspace. Project cards regain status colors and clear hierarchy, with search and status filters. Existing details, tasks, inventory, schedule, and reports use the shared form, table, panel, and button styling.

The new dashboard is at `/projects/dashboard`. Existing project and sign-in destinations remain unchanged. Dashboard statistics use only the verified account's owned, unarchived projects. Active means Planned, In progress, or On hold, matching inventory-demand semantics. Completed is the completed count; completion rate divides completed by all unarchived owned projects, including Cancelled. Shared projects remain outside owner totals. The upcoming panel shows at most five unfinished task deadlines in the next seven days from active owned projects. Dates are UTC.

The original screenshot's activity feed and numbers were prototype fixtures. The restored view uses actual counts and recent project `updatedAt` values, labeled **Recent project updates**. It does not claim a historical activity log or create production fixtures. Recent updates are limited to five projects and ordered by saved update time, with stable ID ties.

## Verification and release boundary

Use the disposable PostgreSQL and browser commands in [Engineering](ENGINEERING.md). Dashboard API tests exercise ownership, shared-reader exclusion, archive filtering, terminal-project/task exclusion, date windows, and stable ordering. Browser tests exercise metrics, links, retry/empty states, project filters, current navigation, and narrow layouts. Desktop/mobile screenshots were inspected against the reference. The full local run passed 48 Node and 71 Chromium tests, with 99.03% source lines and 96.82% branches (`coverage/run-hZPyCD/report/`). A valid-long-name mobile overflow was reproduced, fixed, and covered by a permanent regression.

This UI restoration is separate from the deployed feature release `935418c`. The owner is reviewing new feature behavior on that release. Authentication implementation and production provider settings were unchanged by the feature release; the owner confirmed existing OTP, Google consent, and linking. New UI code does not change those flows.
