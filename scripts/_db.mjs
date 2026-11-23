// ============================================================================
// Connessione al database Neon (Postgres). Il driver parla HTTP: funziona
// solo con Neon.
//
// La connection string NON vive nel codice: si cerca, in ordine,
//   1. la variabile d'ambiente DATABASE_URL / POSTGRES_URL
//   2. il file .env.local nella cartella del progetto (escluso da git)
// Parte da .env.example: copialo in .env.local e mettici la tua.
// ============================================================================
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { neon } from '@neondatabase/serverless'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const CANDIDATI = [join(ROOT, '.env.local')]

function caricaEnv() {
  for (const percorso of CANDIDATI) {
    let raw
    try {
      raw = readFileSync(percorso, 'utf8')
    } catch {
      continue
    }
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
    return percorso
  }
  return null
}

export function connetti() {
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) caricaEnv()
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!url) {
    console.error('[FAIL] DATABASE_URL non trovata. Cercata in:')
    for (const c of CANDIDATI) console.error('  - ' + c)
    process.exit(1)
  }
  return neon(url)
}
