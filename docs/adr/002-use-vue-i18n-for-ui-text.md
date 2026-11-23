# 002: Use vue-i18n for UI text

- **Date**: 2026-11-23
- **Status**: accepted
- **Tags**: frontend, i18n
- **Author**: fracabu <noreply@commercial-ia.com>

## Context

ai-english-only-prose flags Italian UI text in components. rule-styleguide-i18n says components hold keys only.

## Decision

vue-i18n 11 in Composition mode. Display text lives in src/locales/it.json with semantic keys and placeholders.

## Consequences

Users still see Italian. A second language is a new JSON file. Every migrated screen moves its text to it.json.

## What would end this

The app drops the Vue frontend.

## Alternatives Considered

1. A local t() helper with Intl.PluralRules
