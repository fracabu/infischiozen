---
description: "Audit the feature history and normalize it: Conventional Commit violations, merge commits, and (with --force) merge-commit removal - every rewrite behind a confirmation gate"
argument-hint: "[options]"
---
If the text typed after this command is only help, --help or -h (with or without a leading area or persona id), print the block below verbatim and stop: it is the whole answer, do not run the task.

```text
RuleMCP Help: command `/rule-git`

Usage: /rule-git [options]

Audit the feature history and normalize it: Conventional Commit violations, merge commits, and (with --force) merge-commit removal - every rewrite behind a confirmation gate

  options  Space-separated: --force (enable history-normalization proposals). Default: read-only audit.

Examples:
  /rule-git
  /rule-git --force
```

Audit the feature history and normalize it: $ARGUMENTS

1. Run `rule_tool_git` action=audit, passing `force: true` when arguments contain `--force`. Read base branch, merge base, commit range, commit count, Conventional Commit violations and merge commits.
2. commit selection is deterministic: take violations from audit; never re-derive range. For each one, read commit (`git show <sha>`) and propose `type(scope): subject` message that describes it.
3. Show every proposal as `OLD -> NEW` and ask user to confirm. Rewrite nothing before that confirmation.
4. After confirmation, call `rule_tool_git` action=reword confirm=true with `rewrites=[{sha, message}, ...]`, and pass `force: true` when arguments say `--force`. tool refuses message that is not `type(scope): subject`, sha outside feature range, and any call without confirmation.
5. When merge commits are present and `--force` was passed, call `rule_tool_git` action=linearize force=true confirm=true only after user confirms. `--force` enables proposal; it never bypasses confirmation gate.
6. After any rewrite, report verification: commit count, merge commits, and whether final tree is unchanged. rewrite that changed tree is rolled back by tool.
7. NEVER push. NEVER resolve conflict automatically: if rewrite stops or is rolled back, report conflicted files and stop.
8. Write in English, American spelling (color, behavior, organize).
