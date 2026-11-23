---
description: "Declare a usage sidecar via rule_tool_usage when no transcript is available"
argument-hint: "[options]"
---
If the text typed after this command is only help, --help or -h (with or without a leading area or persona id), print the block below verbatim and stop: it is the whole answer, do not run the task.

```text
RuleMCP Help: command `/rule-usage`

Usage: /rule-usage [options]

Declare a usage sidecar via rule_tool_usage when no transcript is available

  options  Reserved. Default: follow the tool schema in the reply.
```

Declare usage sidecar: $ARGUMENTS

1. Call `rule_tool_usage` with token/cost evidence host did not provide as transcript.
2. Do not invent numbers; ask user when evidence is missing.
3. Finish by proposing conventional commit with mandatory scope only if tracked file changed.
