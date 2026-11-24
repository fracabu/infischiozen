# 006: Use undefined instead of null in code, and omit missing keys from API JSON

- **Date**: 2026-11-24
- **Status**: accepted
- **Tags**: api, lint, database
- **Author**: fracabu <noreply@commercial-ia.com>

## Context

The project lints with unicorn/recommended. Its no-null rule flagged 44 null literals in the server, scripts, src and tests folders. Most of them sat on the SQL and JSON boundaries. The owner chose to fix the rule everywhere instead of turning it off.

## Decision

Write undefined, never the null literal. A strict check against null (`=== null`) stays, because the rule allows it and database rows still carry null. At the SQL boundary, an undefined parameter is safe: PGlite and the Neon serverless driver both bind it as NULL (checked in session in the Neon value serializer). At the JSON boundary, JSON.stringify drops a key whose value is undefined. So an API answer now omits a missing field, for example the price of a product with a NULL price, instead of sending it as null. Inside the jsonb invoice-lines column, a line with no product has no product id key. The XML escape function keeps an explicit guard for null and undefined, so the invoice XML never holds the text "null".

## Consequences

Positive: one empty value in code, and the lint passes with the full unicorn preset. Negative: the API JSON contract changed. A client that tests a field with `=== null` now gets undefined and that test fails. The current Vue client checks only truthiness, optional chaining or nullish coalescing, so it works. Tests: 125 unit and 31 e2e pass.

## What would end this

A client needs to tell a missing field from an explicit null, for example a third-party consumer of the API, or a PATCH that clears a field by sending null.

## Alternatives Considered

1. Turn unicorn/no-null off for the whole project: no behavior change, but the owner wanted the rule fixed
1. Turn it off only in the server, scripts and tests folders, and fix src by hand
