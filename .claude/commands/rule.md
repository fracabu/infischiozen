---
description: "Explicitly route a request through rule-mcp"
argument-hint: "<request>"
---
If the text typed after this command is only help, --help or -h (with or without a leading area or persona id), print the block below verbatim and stop: it is the whole answer, do not run the task.

```text
RuleMCP Help: command `/rule`

Usage: /rule

Explicitly route a request through rule-mcp

```

Process this request through recommended rule-mcp workflow:

$ARGUMENTS

Check intent: if the request contains any of these whole tokens (case-insensitive) - check, checks, checking, controlla, controllare, controllo, controlli, validate, validates, validating, validation, valida, validare, validazione, verify, verifies, verifying, verification, verifica, verificare, guardrail, guardrails, lint, linting - run the guardrail-only path below and skip the normal implement sequence.

Check-intent path (do this instead of normal route/implement path):
1. Determine what to check:
   - If paths or files are named after intent words, use those as target.
   - Otherwise, use current git diff (staged + unstaged) as target.
   - If no diff, check entire project.
2. Call `rule_tool_check` with target and auto-detected skill (from changed files, chat context, and codebase frameworks).
3. Fix every guardrail failure and rerun until all pass.
4. Report commands run and real outcomes; never claim unexecuted checks passed.
5. Write every comment and identifier in English, American spelling.
6. Finish by proposing conventional commit message with mandatory scope if tree changed.

Otherwise (no check intent), strongly recommended sequence:
1. Call MCP tool `rule_tool` with complete request and project path/framework when known.
2. Load primary routed `rule-mcp-*` skill and only necessary secondary skills.
3. Use returned skill/tool evidence as source of truth. Never invent APIs, files, dependencies, commands, requirements, or successful checks.
4. If evidence is missing, call `rule_tool_search`; if still missing, state uncertainty instead of guessing.
5. Write every comment, identifier, commit message and generated document in English, American spelling (color, behavior, organize - see rule-process-ai).
6. Implement with failing tests first when code changes.
7. Run `rule_tool_check` against generated code. Fix every failure and rerun until all guardrails pass.
8. Run project tests/typecheck. Report commands and real outcomes; never claim unexecuted checks passed.
9. Finish by proposing conventional commit message with mandatory scope.

Responses are compressed automatically by the server: keep them factual and free of filler.
