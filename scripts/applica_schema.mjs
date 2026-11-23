#!/usr/bin/env node
// ============================================================================
// Applica db/schema.sql al database indicato in DATABASE_URL.
// Idempotente (tutto CREATE ... IF NOT EXISTS / CREATE OR REPLACE): si puo'
// rilanciare senza danni.
//
// Uso:
//   node scripts/applica_schema.mjs [nome_file.sql]
// ============================================================================
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { connetti } from './_db.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const file = process.argv[2] || 'schema.sql'
const percorso = join(ROOT, 'db', file)

const ddl = readFileSync(percorso, 'utf8')
const sql = connetti()

// Il driver HTTP di Neon esegue una istruzione per volta: si divide sui ';'
// di fine riga, tenendo fuori i commenti (che possono contenere ';').
const istruzioni = ddl
  .split('\n')
  .filter((r) => !r.trim().startsWith('--'))
  .join('\n')
  .split(/;\s*$/m)
  .map((s) => s.trim())
  .filter(Boolean)

console.log(`Applico ${file}: ${istruzioni.length} istruzioni`)
let ok = 0
for (const st of istruzioni) {
  const etichetta = st.replace(/\s+/g, ' ').slice(0, 72)
  try {
    await sql.query(st)
    ok++
    console.log(`  [ok]   ${etichetta}`)
  } catch (e) {
    console.error(`  [FAIL] ${etichetta}\n         ${e.message}`)
    process.exit(1)
  }
}
console.log(`\n${ok}/${istruzioni.length} applicate.`)
