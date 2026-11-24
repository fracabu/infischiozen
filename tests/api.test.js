/**
 * API test on a new, empty local database. It replaces the manual API check
 * of REVIEW.md (23 checks): clients, drafts, numbering, date order, external
 * invoices, attached PDF, cancel. A case of a REVIEW.md bug carries its number.
 *
 * The server opens its database and listens when it is imported, so the test
 * starts it as a child process on a temporary PGlite folder and a free port.
 * DATABASE_URL is the .env.example placeholder: the server never reaches Neon.
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const PLACEHOLDER_URL = 'postgresql://utente:password@host/database'
const START_TIMEOUT = 60_000

/**
 * The running test server: child process, data folder, base URL and output.
 */
const instance = { server: undefined, dataDirectory: '', base: '', log: '' }

/**
 * @returns {Promise<number>} a TCP port that is free now
 */
function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer()

    probe.once('error', reject)

    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address()

      probe.close(() => resolve(port))
    })
  })
}

/**
 * Send one request to the API.
 *
 * @param {string} method
 * @param {string} route - path under /api
 * @param {unknown} [body] - JSON body
 * @returns {Promise<{ status: number, body: any }>}
 */
async function call(method, route, body) {
  const response = await fetch(`${instance.base}/api${route}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const answer = await response.json()

  return { status: response.status, body: answer }
}

/**
 * @param {string} method
 * @param {string} route
 * @returns {Promise<number>} the HTTP status of the call
 */
async function statusOf(method, route) {
  const { status } = await call(method, route)

  return status
}

/**
 * @param {string} method
 * @param {string} route
 * @param {unknown} [body]
 * @returns {Promise<any>} the answer body of the call
 */
async function bodyOf(method, route, body) {
  const { body: answer } = await call(method, route, body)

  return answer
}

/**
 * Wait until the server answers, or fail with its output.
 */
async function waitForServer() {
  const deadline = Date.now() + START_TIMEOUT

  while (Date.now() < deadline) {
    if (instance.server.exitCode !== null) {
      throw new Error(`The API server stopped:\n${instance.log}`)
    }

    try {
      const response = await fetch(`${instance.base}/api/stato`)

      if (response.ok) {
        return
      }
    } catch { /* not listening yet */ }

    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  throw new Error(`The API server did not start:\n${instance.log}`)
}

/**
 * Keep the server output, to show it when the server does not start.
 *
 * @param {Buffer} chunk
 */
function keepLog(chunk) {
  instance.log += chunk
}

beforeAll(async () => {
  const port = await freePort()

  instance.dataDirectory = mkdtempSync(path.join(tmpdir(), 'infischiozen-api-'))
  instance.base = `http://127.0.0.1:${port}`

  instance.server = spawn(process.execPath, ['server/index.mjs'], {
    cwd: ROOT,
    env: {
      ...process.env,
      CARTELLA_DATI: instance.dataDirectory,
      PORTA_API: String(port),
      DATABASE_URL: PLACEHOLDER_URL,
    },
  })

  instance.server.stdout.on('data', keepLog)
  instance.server.stderr.on('data', keepLog)

  await waitForServer()
}, START_TIMEOUT)

afterAll(async () => {
  const { server, dataDirectory } = instance

  if (server && server.exitCode === null) {
    const stopped = new Promise((resolve) => server.once('exit', resolve))

    server.kill()
    await stopped
  }

  if (dataDirectory) {
    rmSync(dataDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  }
})

/**
 * @param {string} date - ISO date
 * @param {number} clientId
 * @param {object} [fields]
 * @returns {object} an internal invoice body
 */
const invoiceBody = (date, clientId, fields = {}) => ({
  data: date,
  clienteId: clientId,
  righe: [{ descrizione: 'Consulenza', quantita: 1, prezzoUnitario: 100, totaleRiga: 100 }],
  imponibile: 100,
  totale: 100,
  ...fields,
})

describe('API on an empty database', () => {
  const ids = {}

  test('the status call answers with empty counts', async () => {
    const { status, body } = await call('GET', '/stato')

    expect(status).toBe(200)
    expect(body).toMatchObject({ ok: true, fatture: 0, clienti: 0, prodotti: 0 })
  })

  test('settings on an empty database are the defaults, not confirmed (bug 12)', async () => {
    const { status, body } = await call('GET', '/impostazioni')

    expect(status).toBe(200)
    expect(body.confermato).toBe(false)
    expect(body.prossimoNumeroFattura).toBe(1)
  })

  test('saving the settings confirms them', async () => {
    const { body: current } = await call('GET', '/impostazioni')
    const { status, body } = await call('PUT', '/impostazioni', { ...current, nome: 'Prova' })

    expect(status).toBe(200)
    expect(body).toMatchObject({ confermato: true, nome: 'Prova' })
  })

  test('a client is created, read, changed and listed', async () => {
    const created = await call('POST', '/clienti', { tipo: 'privato', nome: 'Mario', cognome: 'Prova' })

    expect(created.status).toBe(201)
    ids.client = created.body.id

    const changed = await call('PUT', `/clienti/${ids.client}`, { ...created.body, citta: 'Roma' })

    expect(changed.body.citta).toBe('Roma')

    const read = await bodyOf('GET', `/clienti/${ids.client}`)
    const list = await bodyOf('GET', '/clienti')

    expect(read.nomeCompleto).toBe('Mario Prova')
    expect(list.map((client) => client.id)).toContain(ids.client)
    expect(await statusOf('GET', '/clienti/999999')).toBe(404)
  })

  test('a draft has no number', async () => {
    const { status, body } = await call('POST', '/fatture', invoiceBody('2026-03-05', ids.client, { stato: 'bozza' }))

    expect(status).toBe(201)
    expect(body.stato).toBe('bozza')
    expect(body.numero).toBeNull()
    ids.draft = body.id
  })

  test('a draft cannot become issued by a status change (bug 6)', async () => {
    const { status } = await call('PATCH', `/fatture/${ids.draft}/stato`, { stato: 'emessa' })

    expect(status).toBe(409)
  })

  test('issuing gives the next number of the year', async () => {
    const { status, body } = await call('POST', '/fatture', invoiceBody('2026-03-10', ids.client, { stato: 'emessa' }))

    expect(status).toBe(201)
    expect(body).toMatchObject({ numero: 1, anno: 2026, numeroFattura: '1/2026', stato: 'emessa' })
    ids.issued = body.id
  })

  test('a draft takes its number only when it is issued', async () => {
    const { body: draft } = await call('GET', `/fatture/${ids.draft}`)
    const { body } = await call('PUT', `/fatture/${ids.draft}`, { ...draft, data: '2026-03-12', stato: 'emessa' })

    expect(body).toMatchObject({ numero: 2, anno: 2026, stato: 'emessa' })
  })

  test('the year comes from the invoice date (bug 10)', async () => {
    const { body } = await call('POST', '/fatture', invoiceBody('2027-01-05', ids.client, { stato: 'emessa' }))

    expect(body).toMatchObject({ numero: 1, anno: 2027 })
  })

  test('an invoice dated before the last one of its year is refused (bug 9)', async () => {
    const { status } = await call('POST', '/fatture', invoiceBody('2026-03-01', ids.client, { stato: 'emessa' }))

    expect(status).toBe(409)
  })

  test('an issued internal invoice does not change (bug 8)', async () => {
    const { body: issued } = await call('GET', `/fatture/${ids.issued}`)
    const { body } = await call('PUT', `/fatture/${ids.issued}`, { ...issued, totale: 999, imponibile: 999 })

    expect(body.totale).toBe(100)
    expect(body.imponibile).toBe(100)
  })

  test('an external invoice keeps its own number (bugs 7 and 18)', async () => {
    const { status, body } = await call('POST', '/fatture',
      invoiceBody('2026-04-01', ids.client, { origine: 'esterna', numero: 50, stato: 'pagata' }))

    expect(status).toBe(201)
    expect(body).toMatchObject({ numero: 50, anno: 2026, numeroFattura: '50/2026', origine: 'esterna' })
    ids.external = body.id
  })

  test('after an external invoice the app numbering goes on from it', async () => {
    const { body } = await call('POST', '/fatture', invoiceBody('2026-04-02', ids.client, { stato: 'emessa' }))

    expect(body.numero).toBe(51)
  })

  test('a number already used is a 409 with an explanation (bug 17)', async () => {
    const { status, body } = await call('POST', '/fatture',
      invoiceBody('2026-04-03', ids.client, { origine: 'esterna', numero: 50 }))

    expect(status).toBe(409)
    expect(body.errore).toBeTruthy()
  })

  test('a PDF attached to an external invoice comes back the same', async () => {
    const pdf = new TextEncoder().encode('%PDF-1.4 test')

    const put = await fetch(`${instance.base}/api/fatture/${ids.external}/pdf`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/pdf' },
      body: pdf,
    })

    expect(put.status).toBe(200)

    const get = await fetch(`${instance.base}/api/fatture/${ids.external}/pdf`)
    const bytes = new Uint8Array(await get.arrayBuffer())
    const external = await bodyOf('GET', `/fatture/${ids.external}`)
    const missing = await fetch(`${instance.base}/api/fatture/${ids.issued}/pdf`)

    expect(get.headers.get('content-type')).toContain('application/pdf')
    expect(bytes).toEqual(pdf)
    expect(external.pdfEsternoPresente).toBe(true)
    expect(missing.status).toBe(404)
  })

  test('an issued internal invoice is canceled, not deleted', async () => {
    expect(await statusOf('DELETE', `/fatture/${ids.issued}`)).toBe(409)

    const { status, body } = await call('PATCH', `/fatture/${ids.issued}/stato`, { stato: 'annullata' })

    expect(status).toBe(200)
    expect(body.stato).toBe('annullata')
  })

  test('a draft is deleted', async () => {
    const { body: draft } = await call('POST', '/fatture', invoiceBody('2026-05-01', ids.client, { stato: 'bozza' }))

    expect(await statusOf('DELETE', `/fatture/${draft.id}`)).toBe(200)
    expect(await statusOf('GET', `/fatture/${draft.id}`)).toBe(404)
  })

  test('a client with invoices is not deleted, one without is (bug 24)', async () => {
    expect(await statusOf('DELETE', `/clienti/${ids.client}`)).toBe(409)

    const lonely = await bodyOf('POST', '/clienti', { tipo: 'privato', nome: 'Senza', cognome: 'Fatture' })

    expect(await statusOf('DELETE', `/clienti/${lonely.id}`)).toBe(200)
  })

  test('a product is created, changed and deleted', async () => {
    const created = await call('POST', '/prodotti', { nome: 'Lezione', prezzo: 30 })

    expect(created.status).toBe(201)

    const changed = await call('PUT', `/prodotti/${created.body.id}`, { ...created.body, prezzo: 35 })

    expect(changed.body.prezzo).toBe(35)
    expect(await statusOf('DELETE', `/prodotti/${created.body.id}`)).toBe(200)
    expect(await bodyOf('GET', '/prodotti')).toEqual([])
  })
})
