# RepairVantage roadmap

**Decision** · Release against owner-entered real repair projects. Keep fixtures and test accounts in isolated development and test environments.

## Baseline reviewed

**Proven at `bd46f74`** · The routed UI used fixture dashboard and project data, several pages were placeholders, and the app did not mount authentication. Clean package installs succeeded, both builds failed, client lint failed, and the server test runner found no tests. The original GraphQL API accepted a default JWT secret and lacked owner checks on several reads. [Baseline tree](https://github.com/davidmagbee/RepairVantage/tree/bd46f74aed4af2b913acabfc9c4d14a533961cf3)

**Inference** · A deployment of that revision would demonstrate UI scaffolding and expose an unsafe API if the server were public. The first useful release is a narrow, persistent owner workflow.

## Milestones

| Order | Proposed slice | Acceptance |
| --- | --- | --- |
| Launch | Public landing, Google and email-code sign-in, private projects, invitations and comments, unlisted Showcase | Owner can create and reopen a real record. An unrelated account cannot access it. A verified invitee can see project details and comment, and loses access when removed. A signed-out Showcase visitor sees the separately published title, summary, and status until the owner unpublishes it. |
| Project lifecycle | Edit project metadata, manage state, archive or delete with explicit effects | Status transitions are defined. Changes persist. Verify how archive or delete affects existing tasks and related records. |
| Task workflow | Create, schedule, complete, and list tasks inside a project | A project shows task progress. Authorization follows project ownership. Agree on whether assignment grants access before adding it. |
| Parts and tools | Allocate parts and tools to a project or task | Define who owns inventory and whether allocation reserves stock. Verify quantity and concurrent allocation rules. |
| Schedule and dependencies | Calendar, due dates, blocked work | Define time zone, all-day behavior, and allowed dependency edges. Reject cycles and cross-owner references before exposing dependency editing. |
| Reporting | Cost and time views, then exports | Reconcile totals with stored inputs. Specify currency, precision, and export access before using reports to make decisions. |

**Decision** · Projects have one owner. Invited members can read and comment. Owners alone edit the project, manage membership, and publish a Showcase. An unlisted Showcase is accessible to anyone with its link. See the [domain glossary](../GLOSSARY.md) and [schema](../server/prisma/schema.prisma).

**Unknown** · Whether task assignment or a later editor role should expand access. Resolve those semantics before adding task collaboration.

## Launch gates

- Browser test against PostgreSQL. Sign in, create, reload, sign out, and sign in again. Exercise another account against the same project ID.
- Deploy a reviewed revision to an isolated environment. Apply checked-in migrations to the verified database target, confirm readiness and clean-browser HTTPS behavior, and check that private responses are uncached.
- Verify Google consent/callback and Resend delivery at the canonical HTTPS origin. Keep environments separate. Confirm the owner can enter real projects through the normal UI and explicitly choose which summaries to publish.
- Record the URL, exact source revision, migration state, rollback route, and remaining limitations. Publish portfolio claims only for flows verified at that URL.
