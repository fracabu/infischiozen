# 004: Rename code to English, keep the Italian data contract

- **Date**: 2026-11-24
- **Status**: accepted
- **Tags**: naming, api, database, refactor
- **Author**: fracabu <noreply@commercial-ia.com>

## Context

ADR 001 requires English code. After all screens migrated, stores, lib, server, scripts and tests still had Italian names. Part of those names is not code but the data contract: DB columns, JSON field keys, stored status values, the settings JSONB keys, and the error key of the API error answer. Renaming the contract needs a migration of the owner's real data in the local data folder. The env var names for the data folder and the two ports are the owner's configuration.

## Decision

The owner chose to rename only code: file names, exports, identifiers, comments and test titles in src/lib, src/stores, src/data, server, scripts and tests (for example invoiceMath.js, invoiceXml.js, invoicePdf.js, defaultSettings.js, useInvoicesStore with list, load, save and issue, server/mapping.mjs, scripts/apply-schema.mjs). These stay Italian: SQL text and columns, JSON field keys, status values, the error key of the API error answer, server error messages and XML check messages (UI text), PDF and XML document text, env var names, URL paths and route names. server/mapping.mjs is the field glossary. Each rename was checked with a golden capture: 80 invoices through the lib (XML, PDF definition, checks, amounts) and 55 API calls on a fresh database gave byte-identical output before and after. Commits 7901d46, d842f55, 37ff4de.

## Consequences

No data migration, the owner's env file keeps working, the API contract is unchanged. Code mixes English identifiers with Italian data keys, so readers need the field glossary in server/mapping.mjs. Server and XML error texts are still Italian strings outside the locale file, so they cannot be translated. The ESLint errors that predate the rename are still open in lib, server and scripts.

## What would end this

The app needs a second UI language, or the data contract changes for another reason (a new schema version): then rename keys with a migration and move server messages to error codes plus i18n.

## Alternatives Considered

1. Rename the data contract too, with a DB migration script
1. Rename the env vars to English names, with fallback to the old names
1. Send error codes from the server and translate them with vue-i18n
