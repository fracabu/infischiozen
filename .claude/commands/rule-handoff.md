---
description: "Produce a compressed context handoff (ADR summary + git context) to resume in a new session, commiting pending work as scoped Conventional Commits first. Usage: /rule-handoff [options] or /rule-handoff help - no arguments = quick handoff"
argument-hint: "[options]"
---
If the text typed after this command is only help, --help or -h (with or without a leading area or persona id), print the block below verbatim and stop: it is the whole answer, do not run the task.

```text
RuleMCP Help: command `/rule-handoff`

Usage: /rule-handoff [options]
Options (space-separated, all optional):
  handoff | close-session   mode (default: handoff)
  close-feature             close the feature: squash commits, ADRs and handoffs into one commit (confirmation required)
  squash                    legacy modifier with close-feature (now redundant)
  compress | no-compress    aggressively compress / keep output verbose (default: compress)
  full | brief | minimal    output format (default: full)
  no-diff                   omit the working-tree diff
  no-log                    omit the recent commit log
  no-context                omit .context/ values
  no-adrs                   omit the ADR summary
  no-roadmap                omit the roadmap/docs scan
  no-archive                render without archiving completed docs or repairing the ADR numbering
  max=<n>                   cap output to n tokens (0 = no limit)
  help                      show this usage list

Examples:
  /rule-handoff                         # all defaults -> quick handoff
  /rule-handoff close-session           # full session close
  /rule-handoff no-compress minimal     # verbose, compressed one-line JSON
  /rule-handoff no-compress brief       # verbose brief format
  /rule-handoff no-diff                 # handoff without the diff
  /rule-handoff close-session no-diff no-log  # close without diff/log
  /rule-handoff no-compress max=2000    # verbose, token-capped
  /rule-handoff close-feature           # hand off, then close the whole feature as one commit
```

Generate a session handoff and commit pending work: $ARGUMENTS

0. Feature close (`--close-feature`, optionally `--squash`): run `rule_tool_git` action=audit first (force=true when squashing). Report base branch, merge base, range, Conventional Commit violations and merge commits; propose `rule_tool_sync` when branch is behind its base, and `/rule-git` when violations or merges remain. With `--squash`, propose ONE `type(scope): subject` message for WHOLE feature (not last session) from its commits, diff and ADRs; show base branch, merge base, commit count, commit range, commits being squashed and proposed message; ask user to confirm; only then call `rule_tool_git` action=squash force=true confirm=true message="<message>". That single commit also folds feature ADRs and handoffs into one document each (deterministic concatenation, originals deleted, both indexes rebuilt), and refuses if any path other than planned ones changed. Report one commit, consolidated documents, working tree, and documents cited but outside range (left untouched). squash is never run without that confirmation, and `force` never replaces it. Write final feature handoff AFTER squash and commit it alone, as step 3 below.
1. Run `rule_tool_handoff` (default mode `handoff`, all includes on). Pass any tokens from arguments through unchanged (e.g. `close-session`, `compress`, `brief`, `no-diff`, `no-archive`, `max=<n>`). run archives completed audits/reviews/plans as ADRs by default and repairs ADR numbering, so it writes to tree; `no-archive` keeps it read-only diagnosis.
2. If working tree has pending changes, commit them BEFORE emitting handoff as sequence of ATOMIC commits:
   a. Group changed files by concern (one coherent change per group).
   b. Stage each group explicitly (pathspecs or `git add -p`) and commit with Conventional Commits AND mandatory scope: `type(scope): subject` (e.g. `feat(cli): ...`, `chore(eslint): ...`). `commit-msg` hook rejects scope-less messages.
   c. After code/config commits, make ONE SEPARATE final commit for decision documents already pending in tree (ADR, CHANGELOG, docs/): `docs(adr): ...` or `docs(handoff): ...`.
   d. NEVER push. Leave every commit local for review.
   e. MANDATORY dependency policy: before committing, every dependency is exact `"name": "x.y.z"` pin - never `^`, `~`, `*` or range, because range lets sub-dependency arrive without decision. Pin each ranged specifier with project's package manager and `--save-exact` (e.g. `pnpm add <name>@latest --save-exact`), refresh lockfile, and fold manifest change into commit group it belongs to.
3. Persist handoff: write it to `docs/handoff/<NN>-<slug>.md` where NN is next free two-digit number in that directory and <slug> is kebab-case topic (e.g. `13-security-audit-remediation.md`). Open with branch, commit range it covers, and date. document ENDS with its `### Resume Prompt` section: complete block renderer emitted, in place, with path of this file and first step of next session, and leave nothing after closing fence. Then commit that file ALONE - no other paths - as `chore(handoff): add session handoff <NN>-<slug>`. handoff that exists only in chat is lost when session ends.
4. Present handoff as paste-ready block for next session: quote finished `### Resume Prompt` block verbatim, then list commits created. document is source; chat is copy of it.
5. If grouping into atomic commits is ambiguous, ask user how to split before committing.
6. Write handoff and every commit message in English, American spelling (color, behavior, organize).
7. Writing: STE100~80. Short sentences, active voice, one idea per sentence, same word for same thing. Keep about 20% natural tone. Keep findings and summaries short and actionable.
8. Responses are compressed automatically by server: keep handoff factual and free of filler.
