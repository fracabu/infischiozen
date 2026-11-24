# Architecture Decision Records

Every decision this project has taken, newest first. The numbered files in
this directory are the source of truth; this index is generated from them by
`rule_tool_process_adr`, so editing it by hand is work the next call throws away.

## Index

| #                                                                                              | Title                                                                                           | Date       | Status   | Tags                            |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------- | -------- | ------------------------------- |
| [005](005-test-the-browser-on-a-build-and-the-api-in-a-child-process-each-on-a-temporary-p.md) | Test the browser on a build and the API in a child process, each on a temporary PGlite database | 2026-11-24 | accepted | testing, playwright, a11y, api  |
| [004](004-rename-code-to-english-keep-the-italian-data-contract.md)                            | Rename code to English, keep the Italian data contract                                          | 2026-11-24 | accepted | naming, api, database, refactor |
| [003](003-use-pglite-as-the-default-local-database.md)                                         | Use PGlite as the default local database                                                        | 2026-11-23 | accepted | database, infra                 |
| [002](002-use-vue-i18n-for-ui-text.md)                                                         | Use vue-i18n for UI text                                                                        | 2026-11-23 | accepted | frontend, i18n                  |
| [001](001-adopt-rule-mcp-rules-enforced-with-eslint-and-rule-tool-check.md)                    | Adopt rule-mcp rules, enforced with ESLint and rule_tool_check                                  | 2026-11-23 | accepted | toolchain, frontend, process    |

## What each decision says

The opening sentence of each decision and of what it cost, lifted from the
file. Where a line stops short the rest is in the ADR.

| ADR                                                                                            | Decision                                                                                                                                                                                                                  | Consequence                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [005](005-test-the-browser-on-a-build-and-the-api-in-a-child-process-each-on-a-temporary-p.md) | Browser tests use Playwright (@playwright/test 1.65.1 and @axe-core/playwright 4.14.0, exact pins).                                                                                                                       | Positive: tests never touch the real local data or Neon.                                                                                                                                                                     |
| [004](004-rename-code-to-english-keep-the-italian-data-contract.md)                            | The owner chose to rename only code: file names, exports, identifiers, comments and test titles in src/lib, src/stores, src/data, server, scripts and tests (for example invoiceMath.js, invoiceXml.js, invoicePdf.js,... | No data migration, the owner's env file keeps working, the API contract is unchanged.                                                                                                                                        |
| [003](003-use-pglite-as-the-default-local-database.md)                                         | PGlite (Postgres in the Node process) stores data in a local data folder, excluded from git; an environment variable can move it.                                                                                         | npm install and npm run dev work with no setup.                                                                                                                                                                              |
| [002](002-use-vue-i18n-for-ui-text.md)                                                         | vue-i18n 11 in Composition mode.                                                                                                                                                                                          | Users still see Italian.                                                                                                                                                                                                     |
| [001](001-adopt-rule-mcp-rules-enforced-with-eslint-and-rule-tool-check.md)                    | ESLint 10 flat config from the rule-mcp scaffold, plus @stylistic padding, brace-style and indent, applies the JS guardrails.                                                                                             | Every screen must pass rule_tool_check, tests, build and a browser check before commit. main.css and the ModaleConferma adapter stay until the last screen migrates. unicorn/filename-case allows PascalCase folders, per... |

## By theme

Tags carried by 3 or more decisions. A decision appears under every
theme it carries, and the early ADRs that predate the tag field are listed last.

## Operating rules

- Write an ADR with rule_tool_process_adr when the project ADR policy allows it (default: at handoff; mid-task only under full).
- Never rewrite an accepted decision. Supersede it with a new one that says why.
- Never edit this file. Edit the ADR and let the next call regenerate it.
