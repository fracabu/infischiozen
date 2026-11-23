// ============================================================================
// Connessione al database. Due modalità, stessa interfaccia per il server:
//
//   1. LOCALE (predefinita) — PGlite: Postgres che gira dentro Node e salva i
//      dati nella cartella `dati/` del progetto (esclusa da git). Niente
//      account, niente cloud: i dati fiscali restano sul tuo computer.
//   2. NEON — se è impostata DATABASE_URL (o POSTGRES_URL), nell'ambiente o in
//      .env.local. Il driver HTTP di Neon funziona solo con Neon.
//
// In entrambi i casi `connetti()` restituisce un client con:
//   sql`... ${valore} ...`      -> array di righe
//   sql.query(testo, parametri) -> array di righe
// e gli errori di Postgres conservano `code` (es. 23505 = indice unico).
// ============================================================================
import { readFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const FILE_ENV = join(ROOT, '.env.local')

function caricaEnv() {
  let raw
  try {
    raw = readFileSync(FILE_ENV, 'utf8')
  } catch {
    return
  }
  for (const line of raw.split('\n')) {
    if (line.trim().startsWith('#')) continue
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

// Il segnaposto di .env.example non è una connection string vera: se è
// rimasto quello, si usa il database locale invece di fallire.
const SEGNAPOSTO = 'postgresql://utente:password@host/database'

function urlNeon() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!url || url.startsWith(SEGNAPOSTO)) return null
  return url
}

// Il template taggato diventa una query con $1, $2, ...: i valori viaggiano
// sempre come parametri, mai incollati nel testo.
function adattaPglite(db) {
  const query = async (testo, parametri = []) => (await db.query(testo, parametri)).rows
  const sql = (stringhe, ...valori) =>
    query(stringhe.reduce((acc, s, i) => `${acc}$${i}${s}`), valori)
  sql.query = query
  sql.chiudi = () => db.close()
  return sql
}

export async function connetti() {
  caricaEnv()
  const url = urlNeon()
  if (url) {
    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(url)
    sql.chiudi = async () => {}
    sql.modalita = 'neon'
    return sql
  }

  const cartella = resolve(ROOT, process.env.CARTELLA_DATI || 'dati')
  mkdirSync(cartella, { recursive: true })
  const { PGlite } = await import('@electric-sql/pglite')
  const db = await PGlite.create(cartella)
  const sql = adattaPglite(db)
  sql.modalita = 'locale'
  sql.cartella = cartella
  return sql
}

// Applica db/schema.sql. Idempotente: tutto è CREATE ... IF NOT EXISTS.
export async function applicaSchema(sql, { file = 'schema.sql', log = () => {} } = {}) {
  const ddl = readFileSync(join(ROOT, 'db', file), 'utf8')
  // Il driver HTTP di Neon esegue una istruzione per volta: si divide sui ';'
  // di fine riga, tenendo fuori i commenti (che possono contenere ';').
  const istruzioni = ddl
    .split('\n')
    .filter((r) => !r.trim().startsWith('--'))
    .join('\n')
    .split(/;\s*$/m)
    .map((s) => s.trim())
    .filter(Boolean)
  for (const st of istruzioni) {
    try {
      await sql.query(st)
      log(`  [ok]   ${st.replace(/\s+/g, ' ').slice(0, 72)}`)
    } catch (e) {
      e.message = `${st.replace(/\s+/g, ' ').slice(0, 72)}\n         ${e.message}`
      throw e
    }
  }
  return istruzioni.length
}
