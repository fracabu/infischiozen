---
description: "Auto-detect area from context and run rule-mcp guardrails validation"
argument-hint: "[target]"
---
If the text typed after this command is only help, --help or -h (with or without a leading area or persona id), print the block below verbatim and stop: it is the whole answer, do not run the task.

```text
RuleMCP Help: command `/rule-check`

Usage: /rule-check [target]

Auto-detect area from context and run rule-mcp guardrails validation

  target  Paths or files to check. Default: the current git diff, then the whole project.
```

Auto-detect area and run rule-mcp guardrails validation: $ARGUMENTS

1. Determine what to check:
   - If request names paths or files, use those as target.
   - Otherwise, use current git diff (staged + unstaged) as target.
   - If no diff, check entire project.
2. Auto-detect relevant area/skill from context:
   - Analyze changed files to identify primary area (frontend, backend, ui, data, etc.)
   - Consider chat context and recent conversation for intent.
   - Consider codebase structure and frameworks in use.
3. Call `rule_tool_check` with target and detected skill/framework.
4. Fix every guardrail failure and rerun until all pass.
5. Report commands run and real outcomes; never claim unexecuted checks passed.
6. Write every comment and identifier in English, American spelling.
7. Finish by proposing conventional commit message with mandatory scope.
8. Responses are compressed automatically by server: keep it factual and free of filler.
