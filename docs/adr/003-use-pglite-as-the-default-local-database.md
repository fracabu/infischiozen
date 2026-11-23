# 003: Use PGlite as the default local database

- **Date**: 2026-11-23
- **Status**: accepted
- **Tags**: database, infra
- **Author**: fracabu <noreply@commercial-ia.com>

## Context

The app ran only on Neon. The owner had no free Neon project left. A forfettario user wants fiscal data on their own machine, without accounts or cloud.

## Decision

PGlite (Postgres in the Node process) stores data in a local data folder, excluded from git; an environment variable can move it. The server applies the idempotent schema at start. When DATABASE_URL is set, the same queries run on Neon. The connection module adapts PGlite to the Neon client interface: tagged template and query, both return rows.

## Consequences

npm install and npm run dev work with no setup. Only one process can open the data folder at a time. The first real query run found bug 18: the external invoice insert used one parameter as int and as text.

## What would end this

Several users share one database, or the app is hosted online.

## Alternatives Considered

1. Database inside an existing Neon project
1. pg driver with Supabase or local Postgres
