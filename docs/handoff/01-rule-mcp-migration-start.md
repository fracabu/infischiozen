# Handoff 01: rule-mcp migration, start

- Branch: `main`
- Commit range: `0f11611..0997113` (12 commits, this file is the 13th)
- Date: 2026-11-24
- Pushed to origin: up to `7f5ce96`. `29a33a1` and `0997113` are local, for review.

## What this session did

1. Rewrote the README, added `LICENSE` (MIT), `CONTRIBUTING.md` and 43 Vitest tests. Published the public repo `fracabu/infischiozen`.
2. Made PGlite the default database (ADR 003). The data folder is local and excluded from git. `DATABASE_URL` still selects Neon.
3. Ran the API on a real database for the first time: 23-check smoke test. It found bug 18 (external invoice insert, `$1` used as int and text). Fixed.
4. Installed rule-mcp v0.2.1 for this project only. Adopted its rules (ADR 001).
5. Phase 1: ESLint 10 with the rule-mcp scaffold. All five JS formatting guardrails pass. XML output stays byte-identical.
6. Phase 2-3, first screen: app shell, `AppSidebar/`, `ConfirmDialog/` (native `<dialog>`), `Clients/`. Zero classes, `data-part` selectors, one CSS file per component, barrel `index.js`.
7. vue-i18n (ADR 002). UI text is in `src/locales/it.json`. Every migrated file passes `rule_tool_check`.
8. Pinned every dependency to an exact version.

## Current state

- `rule_tool_check` census: 161 file x rule failures at start, 125 after phase 1 (last full census). The files migrated after it all pass. The remaining failures are in screens not yet migrated.
- Tests: 43/43. Build: pass. Smoke test: 23/23.
- `src/assets/main.css` (legacy classes) and `src/components/ModaleConferma.vue` (adapter) stay until the last screen migrates.
- Stores, `src/lib` and `server/` still use Italian names. They change in the language pass.
- `.githooks/` is untracked on purpose. It works only with rule-mcp installed.

## Next steps, in order

1. Client form (`ClienteForm.vue` -> `ClientForm/`): first form, add vee-validate + zod.
2. Products (`Prodotti.vue`, `ProdottoForm.vue`).
3. Invoices (`Fatture.vue`, `FatturaNuova.vue`, `FatturaDettaglio.vue`, `FatturaEsterna.vue`, `RigaFattura.vue`, `DataField.vue`).
4. Dashboard, then Settings.
5. Language pass: English names for stores, `src/lib`, `server/`, `scripts/`, tests.
6. a11y tests: Playwright + `@axe-core/playwright` in `tests/a11y/`.
7. Remove `main.css` and `ModaleConferma.vue`. Turn the smoke test into a Vitest API test.

## How to verify each screen

- `rule_tool_check` on every changed file (skill `rule-frontend-vue`, `rule-styleguide-css`, `rule-styleguide-javascript`).
- `npm test`, `npm run build`, `npx eslint .` on the changed files.
- Browser check on a test instance, never on the real data folder:
  `CARTELLA_DATI=<temp> PORTA_API=3098 node server/index.mjs` and `PORTA_API=3098 PORTA_WEB=5174 npx vite`.
- Commit `type(scope): subject`, then push after each screen (owner decision).

## Known rule-mcp v0.2.1 issues (report to the maintainer)

- `rule_tool_fix` corrupts semicolon-free JS: after `if (x) throw ...` it opens a brace that swallows the next line. Do not use it in fix mode here.
- `rule_tool_fix` without `files` sees only git-changed files.
- `setup --scope project --project-config local --agent claude` wrote the MCP entry at user scope. It was moved to local scope by hand.
- On Windows, `setup` prints "Impossibile trovare il percorso specificato" four times.
- `rule_tool_handoff` reports "(no commits yet)" on this repo.
- The ADR English check rejects real folder and env names (`dati`, `CARTELLA_DATI`).

### Resume Prompt

```prompt
Resume work on infischiozen. Handoff: docs/handoff/01-rule-mcp-migration-start.md.
Run `rule_tool_handon` first: it checks which claims in this handoff still hold before any of them are trusted.
The ADR log (docs/adr) and this handoff capture what has been decided; do not re-ask answered questions.
First step: migrate the client form (src/views/ClienteForm.vue -> src/views/ClientForm/) to rule-frontend-vue with vee-validate + zod, text in src/locales/it.json, then verify with rule_tool_check, tests, build and a browser check on a test instance.
Never run rule_tool_fix in fix mode on this repo. Every dependency is an exact version.
Every commit is `type(scope): subject`; the commit-msg hook rejects a scope-less message.
Writing: STE100~80. Short sentences, active voice, one idea per sentence, same word for the same thing.
```
