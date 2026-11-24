/**
 * @module lib/api
 * HTTP client for the local server (server/index.mjs). The server talks to the
 * Postgres database in DATABASE_URL, or to the local PGlite database.
 * The server sends an error as { errore: message }: that key is part of the
 * API contract and stays Italian.
 */

const BASE = '/api'

/**
 * Send one JSON request and read the JSON answer.
 *
 * @param {string} method
 * @param {string} path - path under /api
 * @param {unknown} [body]
 * @returns {Promise<unknown>} the answer body, or undefined for 204
 */
async function request(method, path, body) {
  let response

  try {
    response = await fetch(BASE + path, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    // The usual cause is not a bug but a stopped server: say so plainly,
    // or the app looks empty instead of disconnected.
    throw new Error(
      "Server dati non raggiungibile. Avvia il gestionale con `npm run dev` " +
      '(che lancia sia le API sia l\'interfaccia).')
  }

  if (!response.ok) {
    let message = `Errore ${response.status}`

    try {
      const answer = await response.json()

      if (answer?.errore) {
        message = answer.errore
      }
    } catch { /* answer with no JSON body: the status code stays */ }

    throw new Error(message)
  }

  if (response.status === 204) {
    return
  }

  return response.json()
}

/**
 * JSON calls to the local API, plus the binary calls for an attached PDF.
 *
 * @type {{ get: Function, post: Function, put: Function, patch: Function, del: Function, getPdf: Function, putPdf: Function }}
 */
export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  del: (path) => request('DELETE', path),

  // The attached PDF travels as binary data, not inside the JSON.
  async getPdf(id) {
    const response = await fetch(`${BASE}/fatture/${id}/pdf`)

    if (response.ok) {
      return response.blob()
    }
  },
  async putPdf(id, blob) {
    const response = await fetch(`${BASE}/fatture/${id}/pdf`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/pdf' },
      body: blob,
    })

    if (!response.ok) {
      throw new Error('Caricamento del PDF non riuscito')
    }

    return response.json()
  },
}
