#!/usr/bin/env node
// ============================================================================
// Server API locale di infischiozen — il ponte fra l'app Vue e il database.
//
// PERCHE' ESISTE: il browser non puo' parlare a Postgres senza mettere la
// connection string dentro il bundle JavaScript. Finche' si gira su localhost
// sembra tollerabile, ma basta un `vite build` e il segreto e' pubblico.
// Questo processo tiene la credenziale lato Node, espone solo dati, e gira in
// ascolto su 127.0.0.1: non e' raggiungibile da fuori dalla macchina.
//
// Avvio:  npm run dev   (parte insieme a Vite)
//         npm run api   (da solo)
// ============================================================================
import express from 'express'
import { connetti, applicaSchema } from '../scripts/_db.mjs'
import { IMPOSTAZIONI_DEFAULT } from '../src/data/impostazioniDefault.js'
import {
  clienteVersoApp, clienteVersoDb,
  fatturaVersoApp, fatturaVersoDb,
  prodottoVersoApp,
} from './mappa.mjs'

const PORTA = Number(process.env.PORTA_API || 3001)
const sql = await connetti()

// Il database locale si prepara da solo: lo schema e' idempotente. Su Neon
// resta un passo esplicito (npm run db:schema).
if (sql.modalita === 'locale') {
  await applicaSchema(sql)
}

const app = express()
app.use(express.json({ limit: '25mb' }))
app.use('/api/fatture/:id/pdf', express.raw({ type: '*/*', limit: '25mb' }))

// Errore con un codice HTTP preciso, da lanciare dentro gli handler.
class ErroreHttp extends Error {
  constructor(status, messaggio) {
    super(messaggio)
    this.status = status
  }
}

// Ogni handler async passa di qui: senza questo wrapper una promise rifiutata
// lascerebbe la richiesta appesa invece di rispondere.
const h = (fn) => (req, res) => fn(req, res).catch((e) => {
  // 23505 = violazione di un indice unico. Sulle fatture vuol dire numero gia'
  // usato (due emissioni simultanee, o una fattura esterna con un numero che
  // esiste gia'): e' un conflitto da spiegare, non un errore del server.
  if (e.code === '23505') {
    return res.status(409).json({
      errore: 'Esiste gia\' un record con lo stesso numero o codice. ' +
              'Se stavi emettendo una fattura, riprova: il numero viene ricalcolato.',
    })
  }

  const status = e.status || 500

  if (status >= 500) {
    console.error(`[${req.method} ${req.path}]`, e.message)
  }

  res.status(status).json({ errore: e.message })
})

// Le date si leggono come testo, mai come Date: vedi la nota in mappa.mjs.
const CAMPI_FATTURA = `
  f.id, f.numero, f.anno, f.numero_fattura, f.data_emissione::text AS data_emissione,
  f.origine, f.cliente_id, f.cliente_snapshot, f.righe,
  f.imponibile, f.applica_rivalsa, f.rivalsa_inps, f.percentuale_rivalsa,
  f.marca_da_bollo, f.totale, f.stato, f.note, f.modalita_pagamento,
  f.scadenza_pagamento::text AS scadenza_pagamento, f.xml_sdi, f.file_pdf,
  (f.pdf_esterno IS NOT NULL) AS ha_pdf, f.created_at, f.updated_at`

const CAMPI_FATTURA_NUDI = CAMPI_FATTURA.replaceAll('f.', '')

const STATI = ['bozza', 'emessa', 'inviata', 'pagata', 'annullata']
const STATI_NUMERATI = ['emessa', 'inviata', 'pagata']

const annoDi = (dataIso) => Number(String(dataIso || '').slice(0, 4)) || new Date().getFullYear()

// ---------------------------------------------------------------- diagnostica
app.get('/api/stato', h(async (_req, res) => {
  const [r] = await sql`
    SELECT (SELECT count(*)::int FROM fatture)         AS fatture,
           (SELECT count(*)::int FROM clienti_fiscali) AS clienti,
           (SELECT count(*)::int FROM prodotti)        AS prodotti`

  res.json({ ok: true, ...r })
}))

// -------------------------------------------------------------------- clienti
app.get('/api/clienti', h(async (_req, res) => {
  const r = await sql`SELECT * FROM clienti_fiscali ORDER BY id DESC`
  res.json(r.map(clienteVersoApp))
}))

app.get('/api/clienti/:id', h(async (req, res) => {
  const [r] = await sql`SELECT * FROM clienti_fiscali WHERE id = ${+req.params.id}`

  if (!r) {
    throw new ErroreHttp(404, 'Cliente non trovato')
  }

  res.json(clienteVersoApp(r))
}))

// Le colonne scrivibili, in ordine: servono a costruire INSERT e UPDATE con
// gli stessi parametri, senza ripetere l'elenco in due punti che possono
// divergere quando si aggiunge un campo.
const COLONNE_CLIENTE = [
  'tipo', 'nome', 'cognome', 'denominazione', 'nome_completo', 'codice_fiscale',
  'partita_iva', 'email', 'indirizzo', 'cap', 'citta', 'provincia', 'nazione',
  'codice_destinatario', 'pec', 'telefono', 'note',
]

app.post('/api/clienti', h(async (req, res) => {
  const c = clienteVersoDb(req.body)
  const segnaposto = COLONNE_CLIENTE.map((_, i) => `$${i + 1}`).join(', ')

  const r = await sql.query(
    `INSERT INTO clienti_fiscali (${COLONNE_CLIENTE.join(', ')})
     VALUES (${segnaposto}) RETURNING *`,
    COLONNE_CLIENTE.map((k) => c[k]))

  res.status(201).json(clienteVersoApp(r[0]))
}))

app.put('/api/clienti/:id', h(async (req, res) => {
  const c = clienteVersoDb(req.body)
  const set = COLONNE_CLIENTE.map((k, i) => `${k} = $${i + 2}`).join(', ')

  const r = await sql.query(
    `UPDATE clienti_fiscali SET ${set}, updated_at = now()
     WHERE id = $1 RETURNING *`,
    [+req.params.id, ...COLONNE_CLIENTE.map((k) => c[k])])

  if (r.length === 0) {
    throw new ErroreHttp(404, 'Cliente non trovato')
  }

  res.json(clienteVersoApp(r[0]))
}))

app.delete('/api/clienti/:id', h(async (req, res) => {
  // Un cliente con fatture non si cancella: il documento fiscale deve restare
  // collegato a chi lo ha ricevuto.
  const [{ n }] = await sql`
    SELECT count(*)::int AS n FROM fatture WHERE cliente_id = ${+req.params.id}`

  if (n > 0) {
    throw new ErroreHttp(409, `Il cliente ha ${n} fatture e non puo' essere eliminato.`)
  }

  await sql`DELETE FROM clienti_fiscali WHERE id = ${+req.params.id}`
  res.json({ ok: true })
}))

// -------------------------------------------------------------------- fatture
app.get('/api/fatture', h(async (_req, res) => {
  const r = await sql.query(`SELECT ${CAMPI_FATTURA} FROM fatture f
    ORDER BY f.anno DESC NULLS LAST, f.numero DESC NULLS FIRST, f.id DESC`)

  res.json(r.map(fatturaVersoApp))
}))

app.get('/api/fatture/:id', h(async (req, res) => {
  const r = await sql.query(
    `SELECT ${CAMPI_FATTURA} FROM fatture f WHERE f.id = $1`, [+req.params.id])

  if (r.length === 0) {
    throw new ErroreHttp(404, 'Fattura non trovata')
  }

  res.json(fatturaVersoApp(r[0]))
}))

// Il PDF allegato viaggia come binario, fuori dal JSON.
app.get('/api/fatture/:id/pdf', h(async (req, res) => {
  const [r] = await sql`SELECT pdf_esterno FROM fatture WHERE id = ${+req.params.id}`

  if (!r?.pdf_esterno) {
    throw new ErroreHttp(404, 'Nessun PDF allegato')
  }

  res.type('application/pdf').send(Buffer.from(r.pdf_esterno))
}))

app.put('/api/fatture/:id/pdf', h(async (req, res) => {
  const r = await sql`UPDATE fatture SET pdf_esterno = ${req.body}, updated_at = now()
            WHERE id = ${+req.params.id} RETURNING id`

  if (r.length === 0) {
    throw new ErroreHttp(404, 'Fattura non trovata')
  }

  res.json({ ok: true })
}))

/**
 * La numerazione deve seguire l'ordine delle date: la fattura n. 5 non puo'
 * avere una data precedente alla n. 4 dello stesso anno.
 */
async function controllaOrdineDate(anno, data) {
  const [r] = await sql`
    SELECT max(data_emissione)::text AS ultima FROM fatture
    WHERE anno = ${anno} AND numero IS NOT NULL`

  if (r?.ultima && data < r.ultima) {
    throw new ErroreHttp(409,
      `La data ${data} e' precedente all'ultima fattura emessa nel ${anno} ` +
      `(${r.ultima}): la numerazione deve seguire l'ordine cronologico.`)
  }
}

// I parametri comuni a INSERT e UPDATE di una fattura, nello stesso ordine
// di COLONNE_FATTURA.
const valoriFattura = (f) => [
  f.data_emissione, f.cliente_id, JSON.stringify(f.cliente_snapshot),
  JSON.stringify(f.righe), f.imponibile, f.applica_rivalsa, f.rivalsa_inps,
  f.percentuale_rivalsa, f.marca_da_bollo, f.totale, f.note,
  f.modalita_pagamento, f.scadenza_pagamento, f.xml_sdi,
]

const COLONNE_FATTURA = `data_emissione, cliente_id, cliente_snapshot, righe,
  imponibile, applica_rivalsa, rivalsa_inps, percentuale_rivalsa,
  marca_da_bollo, totale, note, modalita_pagamento, scadenza_pagamento, xml_sdi`

// Segnaposto $da..$da+13; cliente_snapshot e righe (3o e 4o) sono jsonb.
const segnapostoFattura = (da) => Array.from({ length: 14 }, (_, i) =>
  `$${da + i}${i === 2 || i === 3 ? '::jsonb' : ''}`).join(', ')

/**
 * Creazione.
 *
 * - bozza: nessun numero impegnato finche' non si emette davvero.
 * - interna emessa: il numero lo assegna il DATABASE, dentro la stessa
 *   istruzione che scrive la riga (MAX+1 sull'anno della data). Se due
 *   emissioni partono insieme, l'indice unico (anno, numero) ne respinge una.
 * - esterna (emessa con un altro software): conserva il SUO numero. La
 *   numerazione e' una sola per partita IVA, quindi le fatture dell'app
 *   ripartono dal successivo.
 */
app.post('/api/fatture', h(async (req, res) => {
  const f = fatturaVersoDb(req.body)

  if (!f.data_emissione) {
    throw new ErroreHttp(400, 'Data della fattura mancante')
  }

  const origine = req.body.origine === 'esterna' ? 'esterna' : 'interna'
  const stato = STATI.includes(req.body.stato) ? req.body.stato : 'bozza'
  const anno = annoDi(f.data_emissione)

  if (origine === 'esterna') {
    const numero = Number(req.body.numero)

    if (!Number.isInteger(numero) || numero < 1) {
      throw new ErroreHttp(400, 'Numero della fattura esterna non valido')
    }

    const r = await sql.query(
      `INSERT INTO fatture (numero, anno, numero_fattura, origine, stato, ${COLONNE_FATTURA})
       VALUES ($1::int, $2::int, $1::int::text || '/' || $2::int::text, 'esterna', $3,
               ${segnapostoFattura(4)})
       RETURNING ${CAMPI_FATTURA_NUDI}`,
      [numero, anno, stato === 'bozza' ? 'pagata' : stato, ...valoriFattura(f)])

    return res.status(201).json(fatturaVersoApp(r[0]))
  }

  if (stato === 'bozza') {
    const r = await sql.query(
      `INSERT INTO fatture (numero, anno, numero_fattura, origine, stato, ${COLONNE_FATTURA})
       VALUES (NULL, NULL, 'bozza-' || gen_random_uuid()::text, 'interna', 'bozza',
               ${segnapostoFattura(1)})
       RETURNING ${CAMPI_FATTURA_NUDI}`,
      valoriFattura(f))

    return res.status(201).json(fatturaVersoApp(r[0]))
  }

  await controllaOrdineDate(anno, f.data_emissione)

  const r = await sql.query(
    `INSERT INTO fatture (numero, anno, numero_fattura, origine, stato, ${COLONNE_FATTURA})
     SELECT n.prossimo, $1, n.prossimo || '/' || $1, 'interna', 'emessa',
            ${segnapostoFattura(2)}
     FROM (SELECT COALESCE(MAX(numero), 0) + 1 AS prossimo
           FROM fatture WHERE anno = $1) n
     RETURNING ${CAMPI_FATTURA_NUDI}`,
    [anno, ...valoriFattura(f)])

  res.status(201).json(fatturaVersoApp(r[0]))
}))

/**
 * Aggiornamento.
 *
 * Una fattura interna gia' numerata e' un documento fiscale emesso: importi,
 * righe, cliente e data non si toccano piu'. Si puo' solo salvare l'XML
 * generato. Per correggerla si annulla e se ne emette un'altra (o, a regola,
 * una nota di credito).
 */
app.put('/api/fatture/:id', h(async (req, res) => {
  const f = fatturaVersoDb(req.body)
  const id = +req.params.id
  const [attuale] = await sql`SELECT numero, origine FROM fatture WHERE id = ${id}`

  if (!attuale) {
    throw new ErroreHttp(404, 'Fattura non trovata')
  }

  if (attuale.origine === 'interna' && attuale.numero !== null) {
    const r = await sql.query(
      `UPDATE fatture f SET xml_sdi = $2, updated_at = now()
       WHERE f.id = $1 RETURNING ${CAMPI_FATTURA}`, [id, f.xml_sdi])

    return res.json(fatturaVersoApp(r[0]))
  }

  // Bozza che diventa emessa: prende ORA il suo numero, non prima.
  if (attuale.numero === null && req.body.stato === 'emessa') {
    if (!f.data_emissione) {
      throw new ErroreHttp(400, 'Data della fattura mancante')
    }

    const anno = annoDi(f.data_emissione)
    await controllaOrdineDate(anno, f.data_emissione)

    const r = await sql.query(
      `UPDATE fatture f SET numero = n.prossimo, anno = $2,
         numero_fattura = n.prossimo || '/' || $2, stato = 'emessa',
         (${COLONNE_FATTURA}) = (${segnapostoFattura(3)}), updated_at = now()
       FROM (SELECT COALESCE(MAX(numero), 0) + 1 AS prossimo
             FROM fatture WHERE anno = $2) n
       WHERE f.id = $1 RETURNING ${CAMPI_FATTURA}`,
      [id, anno, ...valoriFattura(f)])

    return res.json(fatturaVersoApp(r[0]))
  }

  // Bozza che resta bozza, oppure fattura esterna (un record, non il documento).
  const r = await sql.query(
    `UPDATE fatture f SET (${COLONNE_FATTURA}) = (${segnapostoFattura(2)}),
       updated_at = now()
     WHERE f.id = $1 RETURNING ${CAMPI_FATTURA}`,
    [id, ...valoriFattura(f)])

  res.json(fatturaVersoApp(r[0]))
}))

app.patch('/api/fatture/:id/stato', h(async (req, res) => {
  const id = +req.params.id
  const nuovo = req.body.stato

  if (!STATI.includes(nuovo) || nuovo === 'bozza') {
    throw new ErroreHttp(400, `Stato non valido: ${nuovo}`)
  }

  const [attuale] = await sql`SELECT numero FROM fatture WHERE id = ${id}`

  if (!attuale) {
    throw new ErroreHttp(404, 'Fattura non trovata')
  }

  // Senza questo controllo una bozza poteva diventare "emessa" restando
  // senza numero: una fattura emessa che non esiste nella numerazione.
  if (attuale.numero === null && STATI_NUMERATI.includes(nuovo)) {
    throw new ErroreHttp(409, 'Una bozza va emessa, non cambiata di stato: usa "Emetti".')
  }

  const r = await sql.query(
    `UPDATE fatture f SET stato = $2, updated_at = now()
     WHERE f.id = $1 RETURNING ${CAMPI_FATTURA}`, [id, nuovo])

  res.json(fatturaVersoApp(r[0]))
}))

app.delete('/api/fatture/:id', h(async (req, res) => {
  // Una fattura interna numerata non si cancella: si annulla. Eliminarla
  // aprirebbe un buco nella numerazione progressiva.
  const [f] = await sql`SELECT numero, origine FROM fatture WHERE id = ${+req.params.id}`

  if (!f) {
    throw new ErroreHttp(404, 'Fattura non trovata')
  }

  if (f.numero !== null && f.origine === 'interna') {
    throw new ErroreHttp(409,
      'Una fattura gia numerata non si elimina: va annullata, ' +
      'altrimenti resta un buco nella numerazione progressiva.')
  }

  await sql`DELETE FROM fatture WHERE id = ${+req.params.id}`
  res.json({ ok: true })
}))

// ------------------------------------------------------------------- prodotti
app.get('/api/prodotti', h(async (_req, res) => {
  const r = await sql`SELECT * FROM prodotti ORDER BY nome`
  res.json(r.map(prodottoVersoApp))
}))

app.post('/api/prodotti', h(async (req, res) => {
  const p = req.body

  const [r] = await sql`
    INSERT INTO prodotti (nome, categoria, unita_misura, prezzo, descrizione, attivo)
    VALUES (${p.nome}, ${p.categoria || null}, ${p.unitaMisura || null},
            ${Number(p.prezzo) || 0}, ${p.descrizione || null}, ${p.attivo !== false})
    RETURNING *`

  res.status(201).json(prodottoVersoApp(r))
}))

app.put('/api/prodotti/:id', h(async (req, res) => {
  const p = req.body

  const [r] = await sql`
    UPDATE prodotti SET nome = ${p.nome}, categoria = ${p.categoria || null},
      unita_misura = ${p.unitaMisura || null}, prezzo = ${Number(p.prezzo) || 0},
      descrizione = ${p.descrizione || null}, attivo = ${p.attivo !== false},
      updated_at = now()
    WHERE id = ${+req.params.id} RETURNING *`

  if (!r) {
    throw new ErroreHttp(404, 'Prodotto non trovato')
  }

  res.json(prodottoVersoApp(r))
}))

app.delete('/api/prodotti/:id', h(async (req, res) => {
  await sql`DELETE FROM prodotti WHERE id = ${+req.params.id}`
  res.json({ ok: true })
}))

// --------------------------------------------------------------- impostazioni
async function prossimoNumero() {
  const [{ prossimo }] = await sql`
    SELECT COALESCE(MAX(numero), 0) + 1 AS prossimo
    FROM fatture WHERE anno = ${new Date().getFullYear()}`

  return prossimo
}

app.get('/api/impostazioni', h(async (_req, res) => {
  const [r] = await sql`SELECT dati FROM impostazioni WHERE id = 1`
  // Al primo avvio la riga non c'e': si parte dai valori di default, con
  // `confermato: false`, e l'app porta l'utente a compilarli.
  const dati = r?.dati || IMPOSTAZIONI_DEFAULT
  // Il prossimo numero si legge SEMPRE dal registro, mai da un contatore.
  res.json({ ...dati, prossimoNumeroFattura: await prossimoNumero() })
}))

app.put('/api/impostazioni', h(async (req, res) => {
  // Il prossimo numero e' calcolato, non salvato: non va nel JSON.
  const { prossimoNumeroFattura, ...resto } = req.body
  const dati = { ...resto, id: 1, confermato: true }

  const [r] = await sql`
    INSERT INTO impostazioni (id, dati) VALUES (1, ${JSON.stringify(dati)}::jsonb)
    ON CONFLICT (id) DO UPDATE SET dati = EXCLUDED.dati, updated_at = now()
    RETURNING dati`

  res.json({ ...r.dati, prossimoNumeroFattura: await prossimoNumero() })
}))

app.listen(PORTA, '127.0.0.1', () => {
  console.log(`[api] infischiozen in ascolto su http://127.0.0.1:${PORTA}`)
  console.log(`[api] database: ${sql.modalita === 'neon' ? 'Neon' : 'locale in ' + sql.cartella}`)
})
