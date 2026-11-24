# Handoff 02: rule-mcp migration complete, tests in the browser and on the API

- **Branch**: `main`
- **Commit range**: `b810a85..2ba0fc0` (4 commits; this handoff file is the next commit)
- **Date**: 2026-11-24
- **Pushed**: `6836520`, `4c19413`, `8d51452` are on `origin/main`. `2ba0fc0` and this handoff are local only.

## What this session did

1. **Bug 24** (`6836520`): Clients, Products and InvoiceDetail ignored a server error on delete. The confirmation stayed open with no message (409 for a client with invoices). Now the dialog closes and the server message shows in `role="alert"`. Added Playwright (`@playwright/test` 1.65.1) with `tests/playwright.config.js` and `tests/e2e/_delete-errors.spec.js`.
2. **Step 6, a11y** (`4c19413`): added `@axe-core/playwright` 4.14.0 and 27 tests in `tests/a11y/` (`_basic` 15, `_forms` 5, `_navigation` 4, `_components` 3). Helpers in `tests/support/` (`seed.js`, `axe.js`, `page.js`). The suite found and the session fixed:
   - **Bug 25**: links in InvoiceForm and ExternalInvoiceForm used `--color-accent-strong` (#a8d418) on a light background, below 4.5:1. They now inherit the text color and have an underline.
   - **Bug 26**: views unmount `ConfirmDialog` with `v-if`, so the browser did not return focus. The dialog now returns focus to its opener.
3. **Step 7** (`8d51452`): removed `src/assets/main.css` and `src/components/ModaleConferma.vue`. A golden check (13 screens, 3 states, full-page screenshots) showed no visible change. The only effect: `main` gets its bottom padding back, which `#app { height: 100% }` used to cut. The old smoke test was manual and not in the repo. It is now `tests/api.test.js`: 19 Vitest tests that start the server as a child process on a temporary PGlite folder. A mutation run (checks for bugs 6 and 8 removed) turned exactly those 2 tests red.
4. **ADR 005** (`2ba0fc0`): Playwright on a production build, API test in a child process, both on temporary PGlite data.

**The rule-mcp migration is complete.** All 7 steps of handoff 01 are done.

## Verified state at the end of the session

- `npm test`: 12 files, 125 tests passed (106 pure functions + 19 API).
- `npm run test:e2e`: 31 passed (27 a11y + 4 e2e), stable over repeated runs.
- `npm run build`: passed.
- ESLint and `rule_tool_check`: clean on every file this session touched.

## Open items, not started

- `npm run lint` on the whole project: 161 errors, all in files this session did not touch (`server/`, `scripts/_db.mjs`, `src/lib/`, older unit tests). Started from `eslint-plugin-unicorn` 80 rules.
- Each Playwright run leaves about 38 MB of PGlite data in the temp folder. No automatic cleanup. A `globalTeardown` could remove it.
- `npm audit`: 16 known vulnerabilities in existing packages (vite, vitest, zod, express, concurrently and others). None come from Playwright or axe.
- The Clients delete message (`clients.deleteMessage` in `src/locales/it.json`) says issued invoices stay unchanged. That is misleading: a client with invoices cannot be deleted at all.
- `tests/api.test.js` covers PGlite only, not Neon.
- No screen reader (NVDA) check and no 200% zoom check yet (noted in REVIEW.md).
- `.githooks/` stays untracked. rule-mcp setup wrote it, but `core.hooksPath` is not set, so it does nothing.
- `rule_tool_handoff` printed "(no commits yet)" under Recent Commits although the branch has commits. Probable tool bug to report to the rule-mcp author.

## Lessons from this session

- A test state that depends on shared data (an empty client list) must be forced with `page.route`. Otherwise the test sees it only by chance.
- With `mode: 'serial'`, one failure skips the next tests. A golden check needs `expect.soft`.
- In a `page.evaluate` callback ESLint rejects `document`. Use `locator(':focus')` and `element.ownerDocument`.
- `rule_tool_check` rejects `eslint-disable` comments (`ai-no-suppressed-errors`).
- `rule_tool_process_adr` rejects Italian identifiers in the ADR body, even env var names. Describe them in English.
- The Vite dev server times out with parallel Playwright workers on a cold start. Test on `vite build && vite preview`.

### Resume Prompt

```prompt
Resume work on infischiozen. Handoff: docs/handoff/02-rule-mcp-migration-complete.md.
Run `rule_tool_handon` first: it checks which claims in this handoff still hold before any of them are trusted.
The ADR log (docs/adr, ADR 001-005) and this handoff capture what has been decided; do not re-ask answered questions.
The rule-mcp migration is complete. First step: push the local commits (2ba0fc0 and the handoff commit) if the owner agrees, then ask the owner which open item comes next; the proposal is to make `npm run lint` pass on the whole project (161 errors in older files), with ESLint --fix or by hand, never rule_tool_fix in fix mode.
Verify with `npm test` (125), `npm run test:e2e` (31), `npm run build`, ESLint and rule_tool_check on touched files.
Every dependency is an exact version. Every commit is `type(scope): subject`; the commit-msg hook rejects a scope-less message.
Writing: STE100~80. Short sentences, active voice, one idea per sentence, same word for the same thing.
```
