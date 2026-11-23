---
description: "Read local telemetry via rule_tool_stats: calls, cache hits, tokens, latency"
argument-hint: "[options]"
---
If the text typed after this command is only help, --help or -h (with or without a leading area or persona id), print the block below verbatim and stop: it is the whole answer, do not run the task.

```text
RuleMCP Help: command `/rule-stats`

Usage: /rule-stats [options]

Read local telemetry via rule_tool_stats: calls, cache hits, tokens, latency

  options  Reserved. Default: full readout.
```

Read local telemetry: $ARGUMENTS

1. Call `rule_tool_stats` and report calls, cache hits, tokens, latency, reminder overhead.
2. Propose only changes numbers support; ask before acting on ambiguous reading.
3. Finish by proposing conventional commit with mandatory scope only if docs change.
