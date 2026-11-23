---
description: "Route a request to one area: ai, backend, data, devops, frontend, meta, platform, process, styleguide, toolchain, ui"
argument-hint: "<area> <request>"
---
If the text typed after this command is only help, --help or -h (with or without a leading area or persona id), print the block below verbatim and stop: it is the whole answer, do not run the task.

```text
RuleMCP Help: command `/rule-area`

Usage: /rule-area <area> <request>

Route a request to one area: ai, backend, data, devops, frontend, meta, platform, process, styleguide, toolchain, ui

  area  One of: ai, backend, data, devops, frontend, meta, platform, process, styleguide, toolchain, ui. First word of the request.
  request  The task, in free text (name leaves like rspack/pnpm/react when known)
```

Route this request through rule-mcp: $ARGUMENTS

Read area from first word of request; rest of that text is task.
Areas: ai (hub `rule-ai`, leaves 4), backend (hub `rule-backend`, leaves 8), data (hub `rule-data`, leaves 8), devops (hub `rule-devops`, leaves 4), frontend (hub `rule-frontend`, leaves 6), meta (hub `rule-meta`, leaves 4), platform (hub `rule-platform`, leaves 4), process (hub `rule-process`, leaves 10), styleguide (hub `rule-styleguide`, leaves 14), toolchain (hub `rule-toolchain`, leaves 8), ui (hub `rule-ui`, leaves 1).
When first word names no area, infer it from task and say which one you used.

Check intent: if the request contains any of these whole tokens (case-insensitive) - check, checks, checking, controlla, controllare, controllo, controlli, validate, validates, validating, validation, valida, validare, validazione, verify, verifies, verifying, verification, verifica, verificare, guardrail, guardrails, lint, linting - run the guardrail-only path below and skip the implement path. The target is the rest of the text after the area.

Check-intent path (do this instead of normal route/implement path):
1. Determine what to check:
   - If paths or files are named after intent words, use those as target.
   - Otherwise, use current git diff (staged + unstaged) as target.
   - If no diff, check entire project.
2. Call `rule_tool_check` with target and hub skill of named area and whichever leaf skills request names.
3. Fix every guardrail failure and rerun until all pass.
4. Report commands run and real outcomes; never claim unexecuted checks passed.
5. Write every comment and identifier in English, American spelling.
6. Finish by proposing conventional commit message with mandatory scope if tree changed.

Otherwise (no check intent):
1. Load hub skill of named area, then parse rest of request for every leaf topic (framework, tool, database,...). Call `rule_tool` and/or each matching leaf `rule_tool_*`, then treat that evidence as source of truth.
2. Never invent APIs, files, dependencies, commands, or requirements not present in evidence; if evidence is missing, call `rule_tool_search` or state uncertainty.
3. Baseline: write failing tests first (TDD) and cover a11y (WCAG 2.2 AA) where applicable; if there is no test/a11y surface, ask user what to cover.
4. Validate generated code with `rule_tool_check`; iterate until all guardrails pass.
5. Write every comment, identifier and generated document in English, American spelling (color, behavior, organize - see rule-process-ai).
6. Finish by proposing conventional commit message with mandatory scope.
7. Responses are compressed automatically by server: keep it factual and free of filler.
