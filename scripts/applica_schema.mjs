#!/usr/bin/env node
// ============================================================================
// Applica db/schema.sql al database (locale PGlite, o Neon se c'è
// DATABASE_URL). Idempotente: si può rilanciare senza danni.
//
// Con il database locale non serve lanciarlo: il server applica lo schema da
// solo all'avvio. Va chiuso il server prima, perché PGlite apre la cartella
// dei dati da un solo processo per volta.
//
// Uso:
//   node scripts/applica_schema.mjs [nome_file.sql]
// ============================================================================
import { connetti, applicaSchema } from './_db.mjs'

const file = process.argv[2] || 'schema.sql'
const sql = await connetti()
console.log(`Database: ${sql.modalita === 'neon' ? 'Neon' : `locale (${sql.cartella})`}`)
console.log(`Applico ${file}`)

try {
  const n = await applicaSchema(sql, { file, log: console.log })
  console.log(`\n${n}/${n} applicate.`)
} catch (e) {
  console.error(`  [FAIL] ${e.message}`)
  process.exitCode = 1
} finally {
  await sql.chiudi()
}
