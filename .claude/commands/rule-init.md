---
description: "Prepare a project end to end: git hooks, recorder directory, tokensave, dependency pins, then scaffold the missing config and toolchain"
argument-hint: "[options]"
---
If the text typed after this command is only help, --help or -h (with or without a leading area or persona id), print the block below verbatim and stop: it is the whole answer, do not run the task.

```text
RuleMCP Help: command `/rule-init`

Usage: /rule-init [options]

Prepare a project end to end: git hooks, recorder directory, tokensave, dependency pins, then scaffold the missing config and toolchain

  options  Space-separated: no-tokensave, no-scaffold. Default: the full init, plus scaffold for a project with no config yet.
```

Prepare this project for rule-mcp: $ARGUMENTS

1. Call `rule_tool_init` (or `rule-mcp init --dir .`). Pass `no-tokensave` / `noTokensave` when arguments carry it. It is idempotent: missing installs, incomplete is integrated, correct is preserved.
2. Report what it answered, per item, without restating it as done when it says `existing` or `refused`: central recorder directory under `~/.rule-mcp/projects/` (local `.rule-mcp` earlier version left behind is migrated, and recorder state is never read from project), `commit-msg` and `pre-push` gates that enforce `type(scope): subject` (in `core.hooksPath`, `.husky` or `.githooks`, whichever project keeps - existing mechanism is integrated, never replaced), tokensave (`initialized`, `failed: ...` or `not installed`), release tooling it detected, and every ranged specifier it found.
3. MANDATORY dependency policy: every dependency is exact `x.y.z` pin - never `^`, `~`, `*` or range, because range lets sub-dependency arrive without decision. Pin each ranged specifier init reported with project's package manager and `--save-exact` (e.g. `pnpm add <name>@latest --save-exact`), refresh lockfile, and report manifests that changed. `workspace:`, `file:`, `link:` and `npm:` aliases are not ranges and are left alone.
4. When project has no framework config yet (fresh checkout, empty repo) and arguments do not say `no-scaffold`, call `rule_tool_detect`, then `rule_tool_styleguide mode=scaffold` for missing config and toolchain files.
5. Check project's test setup exists; when there is no test surface, ask user what to cover.
6. When base branch is not `develop`, `main` or `master`, or branch was cut from another feature branch, tell user to state it once: `git config rule-mcp.baseBranch <name>`.
7. Finish by proposing conventional commit with mandatory scope, e.g. `chore(init): ...`.
