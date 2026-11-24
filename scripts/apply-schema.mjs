#!/usr/bin/env node
/**
 * @module scripts/apply-schema
 * Apply db/schema.sql to the database (local PGlite, or Neon when DATABASE_URL
 * is set). Idempotent: running it again does no harm.
 *
 * With the local database there is no need to run it: the server applies the
 * schema at start. Stop the server first, because PGlite opens the data folder
 * from one process at a time.
 *
 * Usage:
 *   node scripts/apply-schema.mjs [file_name.sql]
 */
import { connect, applySchema } from './_db.mjs'

const file = process.argv[2] || 'schema.sql'
const sql = await connect()
console.log(`Database: ${sql.mode === 'neon' ? 'Neon' : `locale (${sql.dataDir})`}`)
console.log(`Applico ${file}`)

try {
  const count = await applySchema(sql, { file, log: console.log })
  console.log(`\n${count}/${count} applicate.`)
} catch (error) {
  console.error(`  [FAIL] ${error.message}`)
  process.exitCode = 1
} finally {
  await sql.close()
}
