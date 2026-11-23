// ============================================================================
// Client HTTP verso il server locale (server/index.mjs), che a sua volta parla
// al database Postgres indicato in DATABASE_URL.
// ============================================================================

const BASE = '/api'

async function richiesta(metodo, percorso, corpo) {
  let risposta
  try {
    risposta = await fetch(BASE + percorso, {
      method: metodo,
      headers: corpo === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    })
  } catch {
    // Il caso tipico non e' un bug ma il server spento: va detto in chiaro,
    // altrimenti l'app sembra vuota invece che scollegata.
    throw new Error(
      "Server dati non raggiungibile. Avvia il gestionale con `npm run dev` " +
      '(che lancia sia le API sia l\'interfaccia).')
  }
  if (!risposta.ok) {
    let messaggio = `Errore ${risposta.status}`
    try {
      const j = await risposta.json()
      if (j?.errore) messaggio = j.errore
    } catch { /* risposta senza corpo JSON: resta il codice di stato */ }
    throw new Error(messaggio)
  }
  if (risposta.status === 204) return null
  return risposta.json()
}

export const api = {
  get: (p) => richiesta('GET', p),
  post: (p, corpo) => richiesta('POST', p, corpo),
  put: (p, corpo) => richiesta('PUT', p, corpo),
  patch: (p, corpo) => richiesta('PATCH', p, corpo),
  del: (p) => richiesta('DELETE', p),

  // Il PDF allegato viaggia come binario, non dentro il JSON.
  async getPdf(id) {
    const r = await fetch(`${BASE}/fatture/${id}/pdf`)
    if (!r.ok) return null
    return r.blob()
  },
  async putPdf(id, blob) {
    const r = await fetch(`${BASE}/fatture/${id}/pdf`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/pdf' },
      body: blob,
    })
    if (!r.ok) throw new Error('Caricamento del PDF non riuscito')
    return r.json()
  },
}
