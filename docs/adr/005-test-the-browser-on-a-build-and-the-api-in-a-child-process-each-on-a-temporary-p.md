# 005: Test the browser on a build and the API in a child process, each on a temporary PGlite database

- **Date**: 2026-11-24
- **Status**: accepted
- **Tags**: testing, playwright, a11y, api
- **Author**: fracabu <noreply@commercial-ia.com>

## Context

The project had Vitest tests on pure functions only. Views and the server had no automated test: the API check was manual, and rule-mcp requires Playwright with axe-core a11y tests. The server opens its database and listens when it is imported. The Vite dev server compiles each module on the first request: with 4 Playwright workers on a cold start, page.goto timed out after 30 s. The local env file can hold a real Neon connection string.

## Decision

Browser tests use Playwright (@playwright/test 1.65.1 and @axe-core/playwright 4.14.0, exact pins). The Playwright config starts the API on port 3098 and a production build served by vite preview on port 5174. The data folder variable points to a new temporary folder for each run, and DATABASE_URL is forced to the example placeholder. Playwright files end in .spec.js (a11y, e2e and support folders under tests). Vitest runs only the .test.js files. The API test starts the server as a child process on a free port and a temporary PGlite folder, and deletes the folder at the end. The server code does not change for tests.

## Consequences

Positive: tests never touch the real local data or Neon. The a11y suite runs on the same bundle users get. The API test needs no server change. 31 Playwright tests and 19 API tests stay green over repeated runs. Negative: each Playwright run builds the app (about 12 s) and leaves about 38 MB of PGlite data in the temp folder, with no automatic cleanup. The API test covers PGlite only, not Neon.

## What would end this

The server exports its app for in-process tests, a CI pipeline needs a different test instance, or a PGlite and Neon difference reaches production undetected.

## Alternatives Considered

1. Vite dev server for Playwright: rejected, cold-start timeouts with parallel workers
1. Export the Express app from the server module and test it in-process with supertest: rejected for now, it changes the server module and adds a package
1. @vue/test-utils with happy-dom for view tests: rejected, new packages and no real browser for axe
