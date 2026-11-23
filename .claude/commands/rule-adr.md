---
description: "Write an ADR via rule_tool_process_adr, then offer /rule-keep so the decision lands in the export decision-cache"
argument-hint: "[options]"
---
If the text typed after this command is only help, --help or -h (with or without a leading area or persona id), print the block below verbatim and stop: it is the whole answer, do not run the task.

```text
RuleMCP Help: command `/rule-adr`

Usage: /rule-adr [options]

Write an ADR via rule_tool_process_adr, then offer /rule-keep so the decision lands in the export decision-cache

  options  ADR fields as free text (title, context, decision). Default: interview the user for the ADR, then offer keep.
```

Record an architecture decision and keep it: $ARGUMENTS

1. Call `rule_tool_process_adr` with title/context/decision from arguments (or interview user when fields are missing).
2. After ADR is written, offer `/rule-keep` (call `rule_tool_keep`) with fingerprint for that decision and choice that was accepted - only when user confirms.
3. This prompt exists because bare `rule_tool_process_adr` does not bind decision into export decision-cache; `/rule-adr` does both.
4. Do not short-circuit hooks from decision-cache.
5. Writing: STE100~80. Short sentences, active voice, one idea per sentence, same word for same thing. Keep about 20% natural tone. Keep findings and summaries short and actionable.
6. Finish by proposing conventional commit with mandatory scope if tree changed.
