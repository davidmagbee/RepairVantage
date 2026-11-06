# RepairVantage

RepairVantage tracks repair work, the items required to complete it, and when it is scheduled. The [Prisma schema](server/prisma/schema.prisma) and [GraphQL schema](server/src/graphql/schema/index.ts) define the current model.

## Language

**Project** — A private repair effort with one owner. The data model can group tasks, part and tool assignments, and calendar events.

**Archived project** — A project with edits and new comments frozen until the owner restores it. Existing sharing stays readable and the owner can reduce access.

**Owner** — The user the project belongs to. Controls its details, status, priority, membership, and Showcase publication.

**Member** — A verified user granted access to a project by invitation. Members can read shared details and comment.

**Invitation** — An expiring, single-use link scoped to a project and verified recipient email. The owner sends the copied link to the recipient.

**Showcase** — An unlisted public view with its own title and summary plus the project's current status. An owner can publish it and remove access at the link.

**Task** — A unit of work within one project. A task can be assigned to a user and can have its own dates and part or tool assignments.

**Task assignee** — A current project member chosen by the owner to read and edit one assigned task. Removing membership clears the assignment.

**Part** — A repair item that can be assigned to a project or task with a quantity.

**Tool** — A piece of equipment that can be assigned to a project or task with a quantity.

**Assignment** — A link between a part or tool and a project or task, with its own quantity. Use “task assignee” for the user assigned to a task.

**Dependency** — A record with fields for a dependent task and its prerequisite task, or for part and tool requirements.

**Calendar event** — A dated entry that can reference a project, a task, or both.
