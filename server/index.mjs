#!/usr/bin/env node
/**
 * @module server/index
 * Local API server of infischiozen: the bridge between the Vue app and the
 * database.
 *
 * WHY IT EXISTS: the browser cannot talk to Postgres without putting the
 * connection string inside the JavaScript bundle. On localhost that looks
 * tolerable, but one `vite build` makes the secret public. This process keeps
 * the credential on the Node side, exposes only data, and listens on
 * 127.0.0.1: it cannot be reached from outside the machine.
 *
 * Data contract: SQL columns, JSON keys, status values and error messages
 * stay Italian. An error answer is { errore: message }.
 *
 * Start:  npm run dev   (together with Vite)
 *         npm run api   (alone)
 */
import express from 'express'
import { connect, applySchema } from '../scripts/_db.mjs'
import { DEFAULT_SETTINGS } from '../src/data/defaultSettings.js'
import {
  clientToApp, clientToDb,
  invoiceToApp, invoiceToDb,
  productToApp,
} from './mapping.mjs'

const PORT = Number(process.env.PORTA_API || 3001)
const sql = await connect()

// The local database prepares itself: the schema is idempotent. On Neon it
// stays an explicit step (npm run db:schema).
if (sql.mode === 'local') {
  await applySchema(sql)
}

const app = express()
app.use(express.json({ limit: '25mb' }))
app.use('/api/fatture/:id/pdf', express.raw({ type: '*/*', limit: '25mb' }))

/**
 * Error with an exact HTTP status, to throw inside a handler.
 */
class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

// Each async handler goes through here: without this wrapper a rejected
// promise would leave the request hanging instead of answering.
const handle = (fn) => async (req, res) => {
  try {
    await fn(req, res)
  } catch (error) {
    answerError(req, res, error)
  }
}

/**
 * Answer a failed request with { errore: message } and the right status.
 *
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {Error} error - the error the handler threw
 */
function answerError(req, res, error) {
  // 23505 = unique index violation. On invoices it means a number already in
  // use (two issues at the same time, or an external invoice with a number
  // that exists): a conflict to explain, not a server error.
  if (error.code === '23505') {
    res.status(409).json({
      errore: 'Esiste gia\' un record con lo stesso numero o codice. ' +
              'Se stavi emettendo una fattura, riprova: il numero viene ricalcolato.',
    })

    return
  }

  const status = error.status || 500

  if (status >= 500) {
    console.error(`[${req.method} ${req.path}]`, error.message)
  }

  res.status(status).json({ errore: error.message })
}

// Dates are read as text, never as Date: see the note in mapping.mjs.
const INVOICE_FIELDS = `
  f.id, f.numero, f.anno, f.numero_fattura, f.data_emissione::text AS data_emissione,
  f.origine, f.cliente_id, f.cliente_snapshot, f.righe,
  f.imponibile, f.applica_rivalsa, f.rivalsa_inps, f.percentuale_rivalsa,
  f.marca_da_bollo, f.totale, f.stato, f.note, f.modalita_pagamento,
  f.scadenza_pagamento::text AS scadenza_pagamento, f.xml_sdi, f.file_pdf,
  (f.pdf_esterno IS NOT NULL) AS ha_pdf, f.created_at, f.updated_at`

const INVOICE_FIELDS_BARE = INVOICE_FIELDS.replaceAll('f.', '')

const STATUSES = new Set(['bozza', 'emessa', 'inviata', 'pagata', 'annullata'])
const NUMBERED_STATUSES = new Set(['emessa', 'inviata', 'pagata'])

const yearOf = (isoDate = '') => Number(String(isoDate).slice(0, 4)) || new Date().getFullYear()

// ---------------------------------------------------------------- diagnostics
app.get('/api/stato', handle(async (_req, res) => {
  const [row] = await sql`
    SELECT (SELECT count(*)::int FROM fatture)         AS fatture,
           (SELECT count(*)::int FROM clienti_fiscali) AS clienti,
           (SELECT count(*)::int FROM prodotti)        AS prodotti
  `

  res.json({ ok: true, ...row })
}))

// -------------------------------------------------------------------- clients
app.get('/api/clienti', handle(async (_req, res) => {
  const rows = await sql`SELECT * FROM clienti_fiscali ORDER BY id DESC`
  res.json(rows.map((row) => clientToApp(row)))
}))

app.get('/api/clienti/:id', handle(async (req, res) => {
  const [row] = await sql`SELECT * FROM clienti_fiscali WHERE id = ${+req.params.id}`

  if (!row) {
    throw new HttpError(404, 'Cliente non trovato')
  }

  res.json(clientToApp(row))
}))

// The writable columns, in order: INSERT and UPDATE use them with the same
// parameters, so the list is not repeated in two places that can drift apart
// when a field is added.
const CLIENT_COLUMNS = [
  'tipo', 'nome', 'cognome', 'denominazione', 'nome_completo', 'codice_fiscale',
  'partita_iva', 'email', 'indirizzo', 'cap', 'citta', 'provincia', 'nazione',
  'codice_destinatario', 'pec', 'telefono', 'note',
]

app.post('/api/clienti', handle(async (req, res) => {
  const client = clientToDb(req.body)
  const placeholders = CLIENT_COLUMNS.map((_, i) => `$${i + 1}`).join(', ')

  const rows = await sql.query(
    `INSERT INTO clienti_fiscali (${CLIENT_COLUMNS.join(', ')})
     VALUES (${placeholders}) RETURNING *`,
    CLIENT_COLUMNS.map((column) => client[column]))

  res.status(201).json(clientToApp(rows[0]))
}))

app.put('/api/clienti/:id', handle(async (req, res) => {
  const client = clientToDb(req.body)
  const assignments = CLIENT_COLUMNS.map((column, i) => `${column} = $${i + 2}`).join(', ')

  const rows = await sql.query(
    `UPDATE clienti_fiscali SET ${assignments}, updated_at = now()
     WHERE id = $1 RETURNING *`,
    [+req.params.id, ...CLIENT_COLUMNS.map((column) => client[column])])

  if (rows.length === 0) {
    throw new HttpError(404, 'Cliente non trovato')
  }

  res.json(clientToApp(rows[0]))
}))

app.delete('/api/clienti/:id', handle(async (req, res) => {
  // A client with invoices cannot be deleted: the fiscal document must stay
  // linked to whoever received it.
  const [{ n }] = await sql`
    SELECT count(*)::int AS n FROM fatture WHERE cliente_id = ${+req.params.id}
  `

  if (n > 0) {
    throw new HttpError(409, `Il cliente ha ${n} fatture e non puo' essere eliminato.`)
  }

  await sql`DELETE FROM clienti_fiscali WHERE id = ${+req.params.id}`
  res.json({ ok: true })
}))

// ------------------------------------------------------------------- invoices
app.get('/api/fatture', handle(async (_req, res) => {
  const rows = await sql.query(`SELECT ${INVOICE_FIELDS} FROM fatture f
    ORDER BY f.anno DESC NULLS LAST, f.numero DESC NULLS FIRST, f.id DESC`)

  res.json(rows.map((row) => invoiceToApp(row)))
}))

app.get('/api/fatture/:id', handle(async (req, res) => {
  const rows = await sql.query(
    `SELECT ${INVOICE_FIELDS} FROM fatture f WHERE f.id = $1`, [+req.params.id])

  if (rows.length === 0) {
    throw new HttpError(404, 'Fattura non trovata')
  }

  res.json(invoiceToApp(rows[0]))
}))

// The attached PDF travels as binary data, outside the JSON.
app.get('/api/fatture/:id/pdf', handle(async (req, res) => {
  const [row] = await sql`SELECT pdf_esterno FROM fatture WHERE id = ${+req.params.id}`

  if (!row?.pdf_esterno) {
    throw new HttpError(404, 'Nessun PDF allegato')
  }

  res.type('application/pdf').send(Buffer.from(row.pdf_esterno))
}))

app.put('/api/fatture/:id/pdf', handle(async (req, res) => {
  const rows = await sql`UPDATE fatture SET pdf_esterno = ${req.body}, updated_at = now()
            WHERE id = ${+req.params.id} RETURNING id`

  if (rows.length === 0) {
    throw new HttpError(404, 'Fattura non trovata')
  }

  res.json({ ok: true })
}))

/**
 * The numbering must follow the date order: invoice no. 5 cannot have a date
 * before no. 4 of the same year.
 *
 * @param {number} year
 * @param {string} date - ISO date of the new invoice
 */
async function checkDateOrder(year, date) {
  const [row] = await sql`
    SELECT max(data_emissione)::text AS ultima FROM fatture
    WHERE anno = ${year} AND numero IS NOT NULL
  `

  if (row?.ultima && date < row.ultima) {
    throw new HttpError(409,
      `La data ${date} e' precedente all'ultima fattura emessa nel ${year} ` +
      `(${row.ultima}): la numerazione deve seguire l'ordine cronologico.`)
  }
}

// The parameters shared by INSERT and UPDATE of an invoice, in the same order
// as INVOICE_COLUMNS.
const invoiceValues = (invoice) => [
  invoice.data_emissione, invoice.cliente_id, JSON.stringify(invoice.cliente_snapshot),
  JSON.stringify(invoice.righe), invoice.imponibile, invoice.applica_rivalsa, invoice.rivalsa_inps,
  invoice.percentuale_rivalsa, invoice.marca_da_bollo, invoice.totale, invoice.note,
  invoice.modalita_pagamento, invoice.scadenza_pagamento, invoice.xml_sdi,
]

const INVOICE_COLUMNS = `data_emissione, cliente_id, cliente_snapshot, righe,
  imponibile, applica_rivalsa, rivalsa_inps, percentuale_rivalsa,
  marca_da_bollo, totale, note, modalita_pagamento, scadenza_pagamento, xml_sdi`

// Placeholders $from..$from+13; cliente_snapshot and righe (3rd and 4th) are jsonb.
const invoicePlaceholders = (from) => Array.from({ length: 14 }, (_, i) =>
  `$${from + i}${i === 2 || i === 3 ? '::jsonb' : ''}`).join(', ')

/**
 * Create.
 *
 * - draft: no number is taken until the invoice is really issued.
 * - internal issued: the DATABASE gives the number, inside the same statement
 *   that writes the row (MAX+1 on the year of the date). When two issues start
 *   together, the unique index (anno, numero) rejects one.
 * - external (issued with other software): keeps ITS number. There is one
 *   numbering for each VAT number, so the app invoices go on from the next.
 */
app.post('/api/fatture', handle(async (req, res) => {
  const invoice = invoiceToDb(req.body)

  if (!invoice.data_emissione) {
    throw new HttpError(400, 'Data della fattura mancante')
  }

  const origin = req.body.origine === 'esterna' ? 'esterna' : 'interna'
  const status = STATUSES.has(req.body.stato) ? req.body.stato : 'bozza'
  const year = yearOf(invoice.data_emissione)

  if (origin === 'esterna') {
    const number = Number(req.body.numero)

    if (!Number.isSafeInteger(number) || number < 1) {
      throw new HttpError(400, 'Numero della fattura esterna non valido')
    }

    const rows = await sql.query(
      `INSERT INTO fatture (numero, anno, numero_fattura, origine, stato, ${INVOICE_COLUMNS})
       VALUES ($1::int, $2::int, $1::int::text || '/' || $2::int::text, 'esterna', $3,
               ${invoicePlaceholders(4)})
       RETURNING ${INVOICE_FIELDS_BARE}`,
      [number, year, status === 'bozza' ? 'pagata' : status, ...invoiceValues(invoice)])

    return res.status(201).json(invoiceToApp(rows[0]))
  }

  if (status === 'bozza') {
    const rows = await sql.query(
      `INSERT INTO fatture (numero, anno, numero_fattura, origine, stato, ${INVOICE_COLUMNS})
       VALUES (NULL, NULL, 'bozza-' || gen_random_uuid()::text, 'interna', 'bozza',
               ${invoicePlaceholders(1)})
       RETURNING ${INVOICE_FIELDS_BARE}`,
      invoiceValues(invoice))

    return res.status(201).json(invoiceToApp(rows[0]))
  }

  await checkDateOrder(year, invoice.data_emissione)

  const rows = await sql.query(
    `INSERT INTO fatture (numero, anno, numero_fattura, origine, stato, ${INVOICE_COLUMNS})
     SELECT n.prossimo, $1, n.prossimo || '/' || $1, 'interna', 'emessa',
            ${invoicePlaceholders(2)}
     FROM (SELECT COALESCE(MAX(numero), 0) + 1 AS prossimo
           FROM fatture WHERE anno = $1) n
     RETURNING ${INVOICE_FIELDS_BARE}`,
    [year, ...invoiceValues(invoice)])

  res.status(201).json(invoiceToApp(rows[0]))
}))

/**
 * Update.
 *
 * An internal invoice that has a number is an issued fiscal document: amounts,
 * lines, client and date do not change any more. Only the generated XML can be
 * saved. To correct it, cancel it and issue another one (or, by the rules, a
 * credit note).
 */
app.put('/api/fatture/:id', handle(async (req, res) => {
  const invoice = invoiceToDb(req.body)
  const id = +req.params.id
  const [current] = await sql`SELECT numero, origine FROM fatture WHERE id = ${id}`

  if (!current) {
    throw new HttpError(404, 'Fattura non trovata')
  }

  if (current.origine === 'interna' && current.numero !== null) {
    const rows = await sql.query(
      `UPDATE fatture f SET xml_sdi = $2, updated_at = now()
       WHERE f.id = $1 RETURNING ${INVOICE_FIELDS}`, [id, invoice.xml_sdi])

    return res.json(invoiceToApp(rows[0]))
  }

  // A draft that becomes issued takes its number NOW, not before.
  if (current.numero === null && req.body.stato === 'emessa') {
    if (!invoice.data_emissione) {
      throw new HttpError(400, 'Data della fattura mancante')
    }

    const year = yearOf(invoice.data_emissione)
    await checkDateOrder(year, invoice.data_emissione)

    const rows = await sql.query(
      `UPDATE fatture f SET numero = n.prossimo, anno = $2,
         numero_fattura = n.prossimo || '/' || $2, stato = 'emessa',
         (${INVOICE_COLUMNS}) = (${invoicePlaceholders(3)}), updated_at = now()
       FROM (SELECT COALESCE(MAX(numero), 0) + 1 AS prossimo
             FROM fatture WHERE anno = $2) n
       WHERE f.id = $1 RETURNING ${INVOICE_FIELDS}`,
      [id, year, ...invoiceValues(invoice)])

    return res.json(invoiceToApp(rows[0]))
  }

  // A draft that stays a draft, or an external invoice (a record, not the document).
  const rows = await sql.query(
    `UPDATE fatture f SET (${INVOICE_COLUMNS}) = (${invoicePlaceholders(2)}),
       updated_at = now()
     WHERE f.id = $1 RETURNING ${INVOICE_FIELDS}`,
    [id, ...invoiceValues(invoice)])

  res.json(invoiceToApp(rows[0]))
}))

app.patch('/api/fatture/:id/stato', handle(async (req, res) => {
  const id = +req.params.id
  const next = req.body.stato

  if (next === 'bozza' || !STATUSES.has(next)) {
    throw new HttpError(400, `Stato non valido: ${next}`)
  }

  const [current] = await sql`SELECT numero FROM fatture WHERE id = ${id}`

  if (!current) {
    throw new HttpError(404, 'Fattura non trovata')
  }

  // Without this check a draft could become "emessa" with no number: an
  // issued invoice that does not exist in the numbering.
  if (current.numero === null && NUMBERED_STATUSES.has(next)) {
    throw new HttpError(409, 'Una bozza va emessa, non cambiata di stato: usa "Emetti".')
  }

  const rows = await sql.query(
    `UPDATE fatture f SET stato = $2, updated_at = now()
     WHERE f.id = $1 RETURNING ${INVOICE_FIELDS}`, [id, next])

  res.json(invoiceToApp(rows[0]))
}))

app.delete('/api/fatture/:id', handle(async (req, res) => {
  // A numbered internal invoice is not deleted: it is canceled. Deleting it
  // would open a gap in the progressive numbering.
  const [invoice] = await sql`SELECT numero, origine FROM fatture WHERE id = ${+req.params.id}`

  if (!invoice) {
    throw new HttpError(404, 'Fattura non trovata')
  }

  if (invoice.numero !== null && invoice.origine === 'interna') {
    throw new HttpError(409,
      'Una fattura gia numerata non si elimina: va annullata, ' +
      'altrimenti resta un buco nella numerazione progressiva.')
  }

  await sql`DELETE FROM fatture WHERE id = ${+req.params.id}`
  res.json({ ok: true })
}))

// ------------------------------------------------------------------- products
app.get('/api/prodotti', handle(async (_req, res) => {
  const rows = await sql`SELECT * FROM prodotti ORDER BY nome`
  res.json(rows.map((row) => productToApp(row)))
}))

app.post('/api/prodotti', handle(async (req, res) => {
  const product = req.body

  const [row] = await sql`
    INSERT INTO prodotti (nome, categoria, unita_misura, prezzo, descrizione, attivo)
    VALUES (${product.nome}, ${product.categoria || undefined}, ${product.unitaMisura || undefined},
            ${Number(product.prezzo) || 0}, ${product.descrizione || undefined}, ${product.attivo !== false})
    RETURNING *
  `

  res.status(201).json(productToApp(row))
}))

app.put('/api/prodotti/:id', handle(async (req, res) => {
  const product = req.body

  const [row] = await sql`
    UPDATE prodotti SET nome = ${product.nome}, categoria = ${product.categoria || undefined},
      unita_misura = ${product.unitaMisura || undefined}, prezzo = ${Number(product.prezzo) || 0},
      descrizione = ${product.descrizione || undefined}, attivo = ${product.attivo !== false},
      updated_at = now()
    WHERE id = ${+req.params.id} RETURNING *
  `

  if (!row) {
    throw new HttpError(404, 'Prodotto non trovato')
  }

  res.json(productToApp(row))
}))

app.delete('/api/prodotti/:id', handle(async (req, res) => {
  await sql`DELETE FROM prodotti WHERE id = ${+req.params.id}`
  res.json({ ok: true })
}))

// ------------------------------------------------------------------- settings
/**
 * @returns {Promise<number>} next invoice number of the current year
 */
async function nextNumber() {
  const [{ prossimo }] = await sql`
    SELECT COALESCE(MAX(numero), 0) + 1 AS prossimo
    FROM fatture WHERE anno = ${new Date().getFullYear()}
  `

  return prossimo
}

app.get('/api/impostazioni', handle(async (_req, res) => {
  const [row] = await sql`SELECT dati FROM impostazioni WHERE id = 1`
  // On first launch the row does not exist: start from the default values,
  // with `confermato: false`, and the app asks the user to fill them in.
  const settings = row?.dati || DEFAULT_SETTINGS
  // The next number ALWAYS comes from the register, never from a counter.
  res.json({ ...settings, prossimoNumeroFattura: await nextNumber() })
}))

app.put('/api/impostazioni', handle(async (req, res) => {
  // The next number is computed, not saved: it does not go into the JSON.
  const settings = { ...req.body, id: 1, confermato: true }
  delete settings.prossimoNumeroFattura

  const [row] = await sql`
    INSERT INTO impostazioni (id, dati) VALUES (1, ${JSON.stringify(settings)}::jsonb)
    ON CONFLICT (id) DO UPDATE SET dati = EXCLUDED.dati, updated_at = now()
    RETURNING dati
  `

  res.json({ ...row.dati, prossimoNumeroFattura: await nextNumber() })
}))

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[api] infischiozen in ascolto su http://127.0.0.1:${PORT}`)
  console.log(`[api] database: ${sql.mode === 'neon' ? 'Neon' : 'locale in ' + sql.dataDir}`)
})
