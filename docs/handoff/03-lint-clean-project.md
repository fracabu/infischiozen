# Handoff 03: ESLint clean on the whole project

- **Branch**: `main`
- **Commit range**: `9ad26ef..b15bc9e` (5 commits; this handoff file is the next commit)
- **Date**: 2026-11-24
- **Pushed**: `dfc2af3`, `a024e6c`, `78f64e3` are on `origin/main`. `57dfb2f`, `b15bc9e` and this handoff are local only.

## What this session did

1. **Handon** of handoff 02: every claim held. `npm test` passed 125/125 at the start.
2. **Hooks** (`dfc2af3`): tracked `.githooks/post-merge` and `.githooks/post-rewrite`. Both run `rule-mcp handoff land --quiet --commit`.
3. **Lint** (`a024e6c`): `npm run lint` went from 161 errors to 0.
   - 62 errors came from a renamed rule. `eslint-plugin-unicorn` 80 renamed `prevent-abbreviations` to `name-replacements` (`create-plugin.js:55`). The config turned off the old name, so the rule was on again. The config now turns off `unicorn/name-replacements`.
   - 44 `unicorn/no-null` errors: the owner chose to fix them everywhere. PGlite and the Neon driver both bind an `undefined` parameter as SQL `NULL` (checked in session). See ADR 006.
   - `escapeXml` keeps an explicit guard for `null` and `undefined`. A default parameter would write the text "null" into the XML.
   - Other fixes by hand: `Set#has`, `for` loops instead of `reduce`, an async handler wrapper with `try/catch` (`answerError`), store functions at module scope (`getClient`, `getInvoice`, `sendToSdi`), an options parameter in the `invoice()` test helper.
4. **Line ends** (`78f64e3`): `.gitattributes` with `.githooks/* text eol=lf`. `core.autocrlf=true` would otherwise give the hooks CRLF on checkout.
5. **ADR 006** (`57dfb2f`): undefined instead of null in code. The API JSON now omits a missing key instead of sending `null`.

## Verified state at the end of the session

- `npm run lint`: 0 errors.
- `npm test`: 12 files, 125 tests passed.
- `npm run test:e2e`: 31 passed.
- `npm run build`: passed.
- `rule_tool_check` (rule-styleguide-javascript): passed on `scripts/_db.mjs`, `src/lib/api.js` and on excerpts of the changed hunks of the other files. Project mode skipped all checks (graph unavailable).
- Every dependency is an exact version.

## Open items, not started

- Each Playwright run leaves about 38 MB of PGlite data in the temp folder. A `globalTeardown` could remove it.
- `npm audit`: 16 known vulnerabilities in existing packages (vite, vitest, zod, express, concurrently and others).
- The Clients delete message (`clients.deleteMessage` in `src/locales/it.json`) says issued invoices stay unchanged. That is misleading: a client with invoices cannot be deleted.
- `tests/api.test.js` covers PGlite only, not Neon. The undefined-as-NULL claim for Neon rests on a read of the driver code, not on a test.
- No screen reader (NVDA) check and no 200% zoom check yet.
- `.githooks/` is tracked, but `core.hooksPath` is not set, so the hooks do not run.
- ESLint does not lint `.vue` files. They still hold `ref(null)` and `= null`.
- `rule_tool_handoff` printed "(no commits yet)" under Recent Commits again. Probable tool bug to report to the rule-mcp author.

## Lessons from this session

- A renamed lint rule fails open. Check deprecated rule keys after a plugin major update (`create-plugin.js` lists them).
- `no-null` autofix turns `x != null` into `x !== undefined` and loses the `null` case. Write `??` by hand.
- Git Bash heredocs on this machine strip backslashes and `$` sequences, even with a quoted delimiter. One edit lost the `$` of the SQL placeholders and 15 API tests returned 500. Write edit scripts with the Write tool and pass replacements as JSON.
- `unicorn/prefer-ternary`, `prefer-default-parameters` and `no-negated-condition` push on each other. A default parameter changes behavior for `null` input: check each case.

### Resume Prompt

```prompt
Resume work on infischiozen. Handoff: docs/handoff/03-lint-clean-project.md.
Run `rule_tool_handon` first: it checks which claims in this handoff still hold before any of them are trusted.
The ADR log (docs/adr, ADR 001-006) and this handoff capture what has been decided; do not re-ask answered questions.
`npm run lint` is clean on the whole project. First step: push the local commits (57dfb2f, b15bc9e and the handoff commit) if the owner agrees, then ask the owner which open item comes next.
Verify with `npm run lint` (0), `npm test` (125), `npm run test:e2e` (31), `npm run build` and rule_tool_check on touched files.
Every dependency is an exact version. Every commit is `type(scope): subject`; the commit-msg hook rejects a scope-less message.
Writing: STE100~80. Short sentences, active voice, one idea per sentence, same word for the same thing.
```
