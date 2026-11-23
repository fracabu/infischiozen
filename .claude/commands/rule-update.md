---
description: "Apply an available server update explicitly, and report what changed"
argument-hint: "[options]"
---
If the text typed after this command is only help, --help or -h (with or without a leading area or persona id), print the block below verbatim and stop: it is the whole answer, do not run the task.

```text
RuleMCP Help: command `/rule-update`

Usage: /rule-update [options]

Apply an available server update explicitly, and report what changed

  options  Space-separated: check (report only). Default: apply the update.
```

Route this request through rule-mcp: $ARGUMENTS

Scope: Apply an available server update explicitly, and report what changed

Check intent: if the request contains any of these whole tokens (case-insensitive) - check, checks, checking, controlla, controllare, controllo, controlli, validate, validates, validating, validation, valida, validare, validazione, verify, verifies, verifying, verification, verifica, verificare, guardrail, guardrails, lint, linting - run the guardrail-only path and skip the normal route/implement path.

Check-intent path (do this instead of normal route/implement path):
1. Determine what to check:
   - If paths or files are named after intent words, use those as target.
   - Otherwise, use current git diff (staged + unstaged) as target.
   - If no diff, check entire project.
2. Call `rule_tool_check` with target and routed leaf skill(s) for this area.
3. Fix every guardrail failure and rerun until all pass.
4. Report commands run and real outcomes; never claim unexecuted checks passed.
5. Write every comment and identifier in English, American spelling.
6. Finish by proposing conventional commit message with mandatory scope if tree changed.

Otherwise (no check intent):
1. Parse request for every leaf topic (framework, tool, database,...). Call `rule_tool` and/or each matching leaf `rule_tool_*`, then load that skill evidence as source of truth.
2. Never invent APIs, files, dependencies, commands, or requirements not present in evidence; if evidence is missing, call `rule_tool_search` or state uncertainty.
3. Baseline: write failing tests first (TDD) and cover a11y (WCAG 2.2 AA) where applicable; if there is no test/a11y surface, ask user what to cover.
4. Validate generated code with `rule_tool_check`; iterate until all guardrails pass.
5. Write every comment, identifier and generated document in English, American spelling (color, behavior, organize - see rule-process-ai).
6. Finish by proposing conventional commit message with mandatory scope.
7. Responses are compressed automatically by server: keep it factual and free of filler.
