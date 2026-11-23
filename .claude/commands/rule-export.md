---
description: "Distill the current project: session map, idempotent telemetry merge, .flight emit (keep by default), then interview dubious decisions into the export decision-cache"
argument-hint: "[options]"
---
If the text typed after this command is only help, --help or -h (with or without a leading area or persona id), print the block below verbatim and stop: it is the whole answer, do not run the task.

```text
RuleMCP Help: command `/rule-export`

Usage: /rule-export [options]

Distill the current project: session map, idempotent telemetry merge, .flight emit (keep by default), then interview dubious decisions into the export decision-cache

  options  Space-separated: cleanup (confirm-gated session delete later), drain (empty MCP log after .flight). Default: distill + interview, no delete, keep log.
```

Export distill for this project: $ARGUMENTS

1. Use session map and `exportDistill` path (keep MCP events unless arguments say `drain`).
2. Flag dubious decisions (ADR writes, conflicts, KEEP/REJECT markers) and interview user before writing pending/confirmed/discarded entries.
3. For confirmed choice user accepts, call `rule_tool_keep`. For undecided ones, write pending via decision-cache helpers - never invent confirmation.
4. When transcript tool call/result pairs are available, pass them as `toolCalls` to `exportDistill` so only NON_CACHEABLE-safe tools are primed into tool-cache (EX-09). Never invent allowlist; never overwrite existing cache entries.
5. Do not hard-delete agent sessions unless arguments include `cleanup` and user confirmed (Step 6). Unsupported agents are report-only.
6. Finish by proposing conventional commit with mandatory scope only if tracked file changed.
