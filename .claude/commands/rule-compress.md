---
description: "Run rule_tool_compress: sole engine for prompt/context preprocessing and prose postprocessing"
argument-hint: "[options]"
---
If the text typed after this command is only help, --help or -h (with or without a leading area or persona id), print the block below verbatim and stop: it is the whole answer, do not run the task.

```text
RuleMCP Help: command `/rule-compress`

Usage: /rule-compress [options]

Run rule_tool_compress: sole engine for prompt/context preprocessing and prose postprocessing

  options  Space-separated: both | compression | fingerprint (default: both). Pass text via the chat.
```

Compress text with rule_tool_compress: $ARGUMENTS

1. Call `rule_tool_compress` with text to transform. Mode: both | compression | fingerprint (default both).
2. This is sole compression engine: inbound prompt/context preprocessing and outbound prose postprocessing.
3. Keep code fences, URLs and JSON intact. Report tokens before/after when returned.
4. If no text is in chat, ask user what to compress before calling tool.
5. Finish by proposing conventional commit with mandatory scope only if tracked file changed.
