# Matt Pocock skills in RepairVantage

The selected skills ship in [`.agents/skills/`](../../.agents/skills/) at upstream commit [`4ae2317`](https://github.com/mattpocock/skills/commit/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d). Full skill folders, including templates and Codex metadata, are copied verbatim. The [MIT notice](../third-party/matt-pocock-skills.LICENSE) covers those copies. Use this project copy as the source of truth to avoid duplicate skill names from a personal installation.

## Workflows

| When | Invoke | Outcome |
| --- | --- | --- |
| A behavior or domain rule is unsettled | `$grill-with-docs` | Resolve decisions, update glossary and qualifying ADRs. Uses `$grilling` and `$domain-modeling`. |
| Decisions are settled | `$to-spec` → `$to-tickets` | Turn acceptance criteria into vertical slices with blocking dependencies. State whether to draft locally or publish to GitHub. |
| An issue needs classification or evidence | `$triage` | Verify the claim and draft a state transition or agent brief. |
| A ticket is ready to build | `$implement` or `$tdd` | Work one observable slice at a time with agreed test seams. Use `$implement` when a local commit is in scope. |
| A regression needs a reliable reproduction | `$diagnosing-bugs` | Reproduce, narrow, instrument, fix, and run the regression check. |
| A module is costly to change or test | `$improve-codebase-architecture` | Review the current design and choose a seam before refactoring. Uses `$codebase-design`. |
| A change is ready for review | `$code-review` and `$pr` | Review the committed diff against its fixed base and spec. Draft the PR with evidence and merge risk using the repo template. |
| A session exposed repeated friction | `$retro` | Propose the cheapest durable harness improvement. Uses `$writing-for-agents`. |
| The tracker or domain-doc layout changes | `$setup-matt-pocock-skills` | Refresh the [tracker](issue-tracker.md), [triage mapping](triage-labels.md), and [domain docs](domain.md). |

Start in a new Codex chat opened at the repo root. First try `Use $grill-with-docs to scope the shareable RepairVantage release. Ask me only about decisions the code cannot resolve.` When the release criteria are settled, use `Draft a spec and vertical tickets locally` with `$to-spec` and `$to-tickets`. When the first ticket is ready, name its user-facing test seam and invoke `$tdd`.

The upstream instructions use `/skill-name` and sometimes say “call the Skill tool.” In Codex, invoke the skill using `$skill-name` or load its checked-in `SKILL.md` when it is a delegated reference. Repo instructions govern commit, tracker, PR, and deployment actions.

## Updating the pin

Review a specific upstream revision and any changes to instructions, metadata, and scripts. Replace the same selected directories in a scratch checkout using [the upstream skill paths](https://github.com/mattpocock/skills/tree/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills). Preserve whole folders, update the revision links and MIT notice, then compare and verify discovery before merging.
