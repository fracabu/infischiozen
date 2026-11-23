// ============================================================================
// Traduzione fra le due lingue del progetto: snake_case del database e
// camelCase dell'app Vue.
//
// PERCHE' UN FILE A PARTE: l'app parlava a Dexie, dove i record avevano gia'
// la forma delle view. Passando a Postgres i nomi cambiano, e senza un punto
// unico di traduzione la conversione finisce sparsa in ogni endpoint e in ogni
// store — dove basta un `data_emissione` dimenticato per far sparire una data
// dalla pagina senza nessun errore.
//
// REGOLA SULLE DATE: le colonne DATE tornano dal driver come oggetti Date in
// UTC. Renderle con toISOString() sposta indietro di un giorno ogni data
// italiana (06/09 diventa 05/09). Su una fattura la data e' un dato fiscale:
// si leggono SEMPRE come testo dal database (`col::text`) e si trattano come
// stringhe 'YYYY-MM-DD' da qui in poi.
// ============================================================================

const num = (v) => (v === null || v === undefined ? null : Number(v))

export function clienteVersoApp(r) {
  if (!r) {
    return null
  }

  return {
    id: r.id,
    tipo: r.tipo,
    nome: r.nome || '',
    cognome: r.cognome || '',
    ragioneSociale: r.denominazione || '',
    nomeCompleto: r.nome_completo || '',
    codiceFiscale: r.codice_fiscale || '',
    partitaIVA: r.partita_iva || '',
    email: r.email || '',
    indirizzo: r.indirizzo || '',
    cap: r.cap || '',
    citta: r.citta || '',
    provincia: r.provincia || '',
    nazione: r.nazione || 'IT',
    codiceDestinatario: r.codice_destinatario || '0000000',
    pec: r.pec || '',
    telefono: r.telefono || '',
    note: r.note || '',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export function clienteVersoDb(c) {
  const nomeCompleto =
    c.nomeCompleto ||
    (c.ragioneSociale || `${c.nome || ''} ${c.cognome || ''}`.trim())

  return {
    tipo: c.tipo || 'privato',
    nome: c.nome || null,
    cognome: c.cognome || null,
    denominazione: c.ragioneSociale || null,
    nome_completo: nomeCompleto,
    codice_fiscale: c.codiceFiscale || null,
    partita_iva: c.partitaIVA || null,
    email: c.email || null,
    indirizzo: c.indirizzo || null,
    cap: c.cap || null,
    citta: c.citta || null,
    provincia: c.provincia || null,
    nazione: c.nazione || 'IT',
    codice_destinatario: c.codiceDestinatario || '0000000',
    pec: c.pec || null,
    telefono: c.telefono || null,
    note: c.note || null,
  }
}

export function fatturaVersoApp(r) {
  if (!r) {
    return null
  }

  return {
    id: r.id,
    numero: r.numero,
    anno: r.anno,
    numeroFattura: r.numero_fattura,
    data: r.data_emissione,          // gia' testo 'YYYY-MM-DD' (vedi sopra)
    origine: r.origine,
    clienteId: r.cliente_id,
    clienteSnapshot: r.cliente_snapshot || {},
    righe: (r.righe || []).map((x) => ({
      prodottoId: x.prodottoId ?? x.prodotto_id ?? null,
      descrizione: x.descrizione || '',
      quantita: num(x.quantita) ?? 1,
      prezzoUnitario: num(x.prezzoUnitario ?? x.prezzo_unitario) ?? 0,
      totaleRiga: num(x.totaleRiga ?? x.totale_riga) ?? 0,
    })),
    imponibile: num(r.imponibile),
    applicaRivalsaInps: r.applica_rivalsa,
    rivalsaInps: num(r.rivalsa_inps),
    percentualeRivalsa: num(r.percentuale_rivalsa),
    marcaDaBollo: num(r.marca_da_bollo),
    totale: num(r.totale),
    stato: r.stato,
    note: r.note || '',
    modalitaPagamento: r.modalita_pagamento || '',
    scadenzaPagamento: r.scadenza_pagamento || '',
    xmlString: r.xml_sdi || '',
    filePdf: r.file_pdf || '',
    // Il binario non viaggia nel JSON: la view riceve solo il flag e lo store
    // scarica il PDF da /api/fatture/:id/pdf quando serve davvero.
    pdfEsternoPresente: !!r.ha_pdf,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

// I campi scrivibili di una fattura, gia' normalizzati per il database.
export function fatturaVersoDb(f) {
  const righe = (f.righe || []).map((r) => ({
    prodottoId: r.prodottoId ?? null,
    descrizione: r.descrizione || '',
    quantita: Number.isFinite(Number(r.quantita)) ? Number(r.quantita) : 1,
    prezzoUnitario: Number(r.prezzoUnitario) || 0,
    totaleRiga: Number(r.totaleRiga) || 0,
  }))

  return {
    data_emissione: f.data || null,
    cliente_id: f.clienteId ?? null,
    cliente_snapshot: f.clienteSnapshot || {},
    righe,
    imponibile: Number(f.imponibile) || 0,
    applica_rivalsa: f.applicaRivalsaInps !== false,
    rivalsa_inps: Number(f.rivalsaInps) || 0,
    percentuale_rivalsa: Number(f.percentualeRivalsa ?? (f.rivalsaInps > 0 ? 4 : 0)),
    marca_da_bollo: Number(f.marcaDaBollo) || 0,
    totale: Number(f.totale) || 0,
    stato: f.stato || 'bozza',
    note: f.note || null,
    modalita_pagamento: f.modalitaPagamento || null,
    scadenza_pagamento: f.scadenzaPagamento || null,
    xml_sdi: f.xmlString || null,
  }
}

export function prodottoVersoApp(r) {
  if (!r) {
    return null
  }

  return {
    id: r.id,
    nome: r.nome,
    categoria: r.categoria || '',
    unitaMisura: r.unita_misura || '',
    prezzo: num(r.prezzo),
    descrizione: r.descrizione || '',
    attivo: r.attivo,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}
