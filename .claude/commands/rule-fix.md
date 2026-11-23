---
description: "Apply the deterministic guardrail fixes of every skill to the changed files"
argument-hint: "[target]"
---
If the text typed after this command is only help, --help or -h (with or without a leading area or persona id), print the block below verbatim and stop: it is the whole answer, do not run the task.

```text
RuleMCP Help: command `/rule-fix`

Usage: /rule-fix [target]

Apply the deterministic guardrail fixes of every skill to the changed files

  target  Paths or files to fix. Default: the files the current git diff touches, then the whole project.
```

Apply the deterministic guardrail fixes to the changed files: $ARGUMENTS

1. Determine target:
   - If request names paths or files, use those.
   - Otherwise, use current git diff (staged + unstaged).
   - If no diff, fix entire project.
2. Call `rule_tool_fix` with `mode=fix` over that target. It applies fixes machine can settle
   without judgment: blank lines, braces, single-line bodies, ASCII typography, American spelling.
3. Call `rule_tool_check` on same target for findings that need judgment, and fix those.
4. Report files changed and commands run; never claim unexecuted fix.
5. Write every comment and identifier in English, American spelling.
6. Finish by proposing conventional commit with mandatory scope if tree changed.
7. Responses are compressed automatically by server: keep it factual and free of filler.
