---
description: "Resume: verify the last handoff against the repository as it is now, archive what finished, and propose the next workstream"
argument-hint: "[options]"
---
If the text typed after this command is only help, --help or -h (with or without a leading area or persona id), print the block below verbatim and stop: it is the whole answer, do not run the task.

```text
RuleMCP Help: command `/rule-handon`

Usage: /rule-handon [options]

Resume: verify the last handoff against the repository as it is now, archive what finished, and propose the next workstream

  options  Space-separated: list, file=<path>, no-archive. Default: the newest handoff, swept and verified.
```

Verify the last handoff against the repository now: $ARGUMENTS

1. Call `rule_tool_handon` for this project (or `rule-mcp handon --dir .`). Pass any tokens from arguments through unchanged (e.g. `list`, `file=<path>`, `no-archive`).
2. Every claim it returns carries its own verdict: act on what is still true, re-derive what changed, and treat unverified as unknown.
3. call also sweeps completed audits/reviews/plans into ADRs and reports them under Closeout. Those writes are uncommitted: stage them as one `docs(adr): ...` commit (pass `no-archive` to skip sweep).
4. Under `Next from the plans` it proposes first open step of each plan that still has one. Present that proposal and ask user which workstream to start. Do not begin it unprompted.
5. Finish by proposing conventional commit with mandatory scope if repo changed.
6. Responses are compressed automatically by server: keep it factual and free of filler.
