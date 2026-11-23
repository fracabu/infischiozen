---
description: "Confirm one decision into the export decision-cache via rule_tool_keep"
argument-hint: "[options]"
---
If the text typed after this command is only help, --help or -h (with or without a leading area or persona id), print the block below verbatim and stop: it is the whole answer, do not run the task.

```text
RuleMCP Help: command `/rule-keep`

Usage: /rule-keep [options]

Confirm one decision into the export decision-cache via rule_tool_keep

  options  fingerprint=<id> choice=<text|json> [agent=<id>]. Default: ask the user for fingerprint and choice.
```

Confirm one decision into export decision-cache: $ARGUMENTS

1. Parse fingerprint and choice from arguments (fingerprint=<id> choice=<text|json> [agent=<id>]).
2. Call `rule_tool_keep` with those fields. Do not invent fingerprint or choice.
3. Report confirmed record. Do not short-circuit hooks from this cache.
4. Finish by proposing conventional commit with mandatory scope only if tracked file changed.
