# 001: Adopt rule-mcp rules, enforced with ESLint and rule_tool_check

- **Date**: 2026-11-23
- **Status**: accepted
- **Tags**: toolchain, frontend, process
- **Author**: fracabu <noreply@commercial-ia.com>

## Context

The owner wants the project to follow rule-mcp. The first census found 21 failing guardrails, 161 file x rule failures. rule_tool_fix v0.2.1 corrupted semicolon-free JS (braces after if-throw swallowed the next line), so it cannot be the fixer.

## Decision

ESLint 10 flat config from the rule-mcp scaffold, plus @stylistic padding, brace-style and indent, applies the JS guardrails. Autofix is limited to layout rules and checked by a byte-identical XML comparison. The frontend moves to the rule-frontend-vue tree one screen at a time: zero classes, data-part selectors, external CSS per component, barrel index.js. All code, comments and file names are English. vee-validate + zod for forms and Playwright + axe for a11y tests are approved.

## Consequences

Every screen must pass rule_tool_check, tests, build and a browser check before commit. main.css and the ModaleConferma adapter stay until the last screen migrates. unicorn/filename-case allows PascalCase folders, per the rule-mcp file tree.

## What would end this

rule-mcp is removed from the project.

## Alternatives Considered

1. Fix by hand without ESLint
1. Keep Italian identifiers and accept two red guardrails
