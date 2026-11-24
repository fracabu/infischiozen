/**
 * @module scripts/_db
 * Database connection. Two modes, one interface for the server:
 *
 *   1. LOCAL (default): PGlite, a Postgres that runs inside Node and saves the
 *      data in the project folder `dati/` (excluded from git). No account, no
 *      cloud: the fiscal data stays on your computer.
 *   2. NEON: when DATABASE_URL (or POSTGRES_URL) is set, in the environment or
 *      in .env.local. The Neon HTTP driver works only with Neon.
 *
 * In both cases `connect()` returns a client with:
 *   sql`... ${value} ...`      -> array of rows
 *   sql.query(text, params)    -> array of rows
 * and Postgres errors keep their `code` (for example 23505 = unique index).
 * The env var names (CARTELLA_DATI, PORTA_API) stay Italian: they are user
 * configuration.
 */
import { readFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const ENV_FILE = path.join(ROOT, '.env.local')

/**
 * Read .env.local into process.env. A variable already set wins.
 */
function loadEnv() {
  let raw

  try {
    raw = readFileSync(ENV_FILE, 'utf8')
  } catch {
    return
  }

  for (const line of raw.split('\n')) {
    if (line.trimStart().startsWith('#')) {
      continue
    }

    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/)

    if (!match) {
      continue
    }

    const [, name, value] = match
    const current = process.env[name]

    if (!current) {
      process.env[name] = value.replaceAll(/^["']|["']$/g, '')
    }
  }
}

// The .env.example placeholder is not a real connection string: when it is
// still there, use the local database instead of failing.
const PLACEHOLDER = 'postgresql://utente:password@host/database'

/**
 * @returns {string|undefined} the Neon connection string, or undefined for local mode
 */
function neonUrl() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL

  if (url && !url.startsWith(PLACEHOLDER)) {
    return url
  }
}

// The tagged template becomes a query with $1, $2, ...: the values always
// travel as parameters, never pasted into the text.
function adaptPglite(db) {
  const query = async (text, params = []) => {
    const result = await db.query(text, params)

    return result.rows
  }

  const sql = (strings, ...values) =>
    query(strings.map((part, i) => (i === 0 ? part : `$${i}${part}`)).join(''), values)

  sql.query = query
  sql.close = () => db.close()

  return sql
}

/**
 * Open the database: Neon when a connection string exists, else local PGlite.
 *
 * @returns {Promise<Function>} the sql client, with mode and close()
 */
export async function connect() {
  loadEnv()
  const url = neonUrl()

  if (url) {
    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(url)
    sql.close = async () => {}
    sql.mode = 'neon'

    return sql
  }

  const dataDir = path.resolve(ROOT, process.env.CARTELLA_DATI || 'dati')
  mkdirSync(dataDir, { recursive: true })
  const { PGlite } = await import('@electric-sql/pglite')
  const db = await PGlite.create(dataDir)
  const sql = adaptPglite(db)
  sql.mode = 'local'
  sql.dataDir = dataDir

  return sql
}

/**
 * Apply db/schema.sql. Idempotent: each statement is CREATE ... IF NOT EXISTS.
 *
 * @param {Function} sql - client from connect()
 * @param {{ file?: string, log?: Function }} [options]
 * @returns {Promise<number>} number of statements applied
 */
export async function applySchema(sql, { file = 'schema.sql', log = () => {} } = {}) {
  const ddl = readFileSync(path.join(ROOT, 'db', file), 'utf8')

  // The Neon HTTP driver runs one statement at a time: split on the ';' at
  // line end, and leave out the comments (they can hold ';').
  const statements = ddl
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n')
    .split(/;\s*$/m)
    .map((statement) => statement.trim())
    .filter(Boolean)

  for (const statement of statements) {
    try {
      await sql.query(statement)
      log(`  [ok]   ${statement.replaceAll(/\s+/g, ' ').slice(0, 72)}`)
    } catch (error) {
      error.message = `${statement.replaceAll(/\s+/g, ' ').slice(0, 72)}\n         ${error.message}`
      throw error
    }
  }

  return statements.length
}
