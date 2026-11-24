# Session Handoffs

Every session handoff this project has taken, newest first. The numbered
files in this directory are the source of truth; this index is generated from
them by `handoff doctor`, so editing it by hand is work the next run throws away.

## Index

| #                                       | Title                                                                        | Date       | Branch |
| --------------------------------------- | ---------------------------------------------------------------------------- | ---------- | ------ |
| [02](02-rule-mcp-migration-complete.md) | Handoff 02: rule-mcp migration complete, tests in the browser and on the API | 2026-11-24 | main   |
| [01](01-rule-mcp-migration-start.md)    | Handoff 01: rule-mcp migration, start                                        | 2026-11-24 | main   |

## Operating rules

- Write a handoff with `/rule-handoff`; it persists to `docs/handoff/<NN>-<slug>.md`.
- Never edit this file. Edit a handoff and let the next `handoff doctor` regenerate it.
