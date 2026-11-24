# Issue tracker

The tracker is [davidmagbee/RepairVantage GitHub Issues](https://github.com/davidmagbee/RepairVantage/issues). Keep release and roadmap drafts in the repository until the maintainer authorizes publication.

**PRs as a request surface: no.** Review explicitly named pull requests as code changes.

## Read

```sh
gh repo view davidmagbee/RepairVantage --json nameWithOwner,hasIssuesEnabled
gh issue list -R davidmagbee/RepairVantage --state open --json number,title,labels
gh issue view <number> -R davidmagbee/RepairVantage --json number,title,body,labels,comments,state
gh label list -R davidmagbee/RepairVantage --limit 100 --json name
```

## Publish and triage

With authorization, use `gh issue create` or `gh issue comment` with `-R davidmagbee/RepairVantage` and `--body-file`. Use the [triage mapping](triage-labels.md) for label changes. Verify that any labels you intend to apply exist.

Publish dependencies in blocker-first order. Prefer GitHub's [native blocking relationships](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-issue-dependencies) and [sub-issues](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/adding-sub-issues). Use the GitHub UI if the installed CLI lacks the operations. If native relationships are unavailable, use `Blocked by #N` and `Part of #N` in the issue body. A ticket is startable when every blocking issue is closed.

`$to-spec` and `$to-tickets` produce material for this tracker. `$triage` can apply labels, comment, and close issues. Read-only requests cover inspection and drafting.
