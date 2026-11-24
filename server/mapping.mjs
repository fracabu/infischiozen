/**
 * @module server/mapping
 * Translation between the two shapes of the project: snake_case rows of the
 * database and camelCase records of the Vue app. Both shapes keep their
 * Italian field names: they are the data contract.
 *
 * WHY A SEPARATE FILE: the app first used Dexie, where records already had
 * the shape of the views. With Postgres the names change, and without one
 * translation point the conversion spreads into each endpoint and each store,
 * where one forgotten `data_emissione` makes a date vanish from the page with
 * no error.
 *
 * DATE RULE: the driver returns DATE columns as Date objects in UTC. Showing
 * them with toISOString() moves each Italian date back by one day (06/09
 * becomes 05/09). On an invoice the date is fiscal data: ALWAYS read it as
 * text from the database (`col::text`) and treat it as a 'YYYY-MM-DD' string
 * from here on.
 */

/**
 * @param {unknown} value
 * @returns {number|null} the value as a number, null when it is missing
 */
const toNumber = (value) => (value === null || value === undefined ? null : Number(value))

/**
 * @param {object} row - clienti_fiscali row
 * @returns {object|null} client record for the app
 */
export function clientToApp(row) {
  if (!row) {
    return null
  }

  return {
    id: row.id,
    tipo: row.tipo,
    nome: row.nome || '',
    cognome: row.cognome || '',
    ragioneSociale: row.denominazione || '',
    nomeCompleto: row.nome_completo || '',
    codiceFiscale: row.codice_fiscale || '',
    partitaIVA: row.partita_iva || '',
    email: row.email || '',
    indirizzo: row.indirizzo || '',
    cap: row.cap || '',
    citta: row.citta || '',
    provincia: row.provincia || '',
    nazione: row.nazione || 'IT',
    codiceDestinatario: row.codice_destinatario || '0000000',
    pec: row.pec || '',
    telefono: row.telefono || '',
    note: row.note || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * @param {object} client - client record from the app
 * @returns {object} writable columns of clienti_fiscali
 */
export function clientToDb(client) {
  const fullName =
    client.nomeCompleto ||
    (client.ragioneSociale || `${client.nome || ''} ${client.cognome || ''}`.trim())

  return {
    tipo: client.tipo || 'privato',
    nome: client.nome || null,
    cognome: client.cognome || null,
    denominazione: client.ragioneSociale || null,
    nome_completo: fullName,
    codice_fiscale: client.codiceFiscale || null,
    partita_iva: client.partitaIVA || null,
    email: client.email || null,
    indirizzo: client.indirizzo || null,
    cap: client.cap || null,
    citta: client.citta || null,
    provincia: client.provincia || null,
    nazione: client.nazione || 'IT',
    codice_destinatario: client.codiceDestinatario || '0000000',
    pec: client.pec || null,
    telefono: client.telefono || null,
    note: client.note || null,
  }
}

/**
 * @param {object} row - fatture row
 * @returns {object|null} invoice record for the app
 */
export function invoiceToApp(row) {
  if (!row) {
    return null
  }

  return {
    id: row.id,
    numero: row.numero,
    anno: row.anno,
    numeroFattura: row.numero_fattura,
    data: row.data_emissione,          // already 'YYYY-MM-DD' text (see above)
    origine: row.origine,
    clienteId: row.cliente_id,
    clienteSnapshot: row.cliente_snapshot || {},
    righe: (row.righe || []).map((line) => ({
      prodottoId: line.prodottoId ?? line.prodotto_id ?? null,
      descrizione: line.descrizione || '',
      quantita: toNumber(line.quantita) ?? 1,
      prezzoUnitario: toNumber(line.prezzoUnitario ?? line.prezzo_unitario) ?? 0,
      totaleRiga: toNumber(line.totaleRiga ?? line.totale_riga) ?? 0,
    })),
    imponibile: toNumber(row.imponibile),
    applicaRivalsaInps: row.applica_rivalsa,
    rivalsaInps: toNumber(row.rivalsa_inps),
    percentualeRivalsa: toNumber(row.percentuale_rivalsa),
    marcaDaBollo: toNumber(row.marca_da_bollo),
    totale: toNumber(row.totale),
    stato: row.stato,
    note: row.note || '',
    modalitaPagamento: row.modalita_pagamento || '',
    scadenzaPagamento: row.scadenza_pagamento || '',
    xmlString: row.xml_sdi || '',
    filePdf: row.file_pdf || '',
    // The binary does not travel in the JSON: the view gets only the flag, and
    // the store downloads the PDF from /api/fatture/:id/pdf when it needs it.
    pdfEsternoPresente: !!row.ha_pdf,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * The writable fields of an invoice, normalized for the database.
 *
 * @param {object} invoice - invoice record from the app
 * @returns {object} writable columns of fatture
 */
export function invoiceToDb(invoice) {
  const lines = (invoice.righe || []).map((line) => ({
    prodottoId: line.prodottoId ?? null,
    descrizione: line.descrizione || '',
    quantita: Number.isFinite(Number(line.quantita)) ? Number(line.quantita) : 1,
    prezzoUnitario: Number(line.prezzoUnitario) || 0,
    totaleRiga: Number(line.totaleRiga) || 0,
  }))

  return {
    data_emissione: invoice.data || null,
    cliente_id: invoice.clienteId ?? null,
    cliente_snapshot: invoice.clienteSnapshot || {},
    righe: lines,
    imponibile: Number(invoice.imponibile) || 0,
    applica_rivalsa: invoice.applicaRivalsaInps !== false,
    rivalsa_inps: Number(invoice.rivalsaInps) || 0,
    percentuale_rivalsa: Number(invoice.percentualeRivalsa ?? (invoice.rivalsaInps > 0 ? 4 : 0)),
    marca_da_bollo: Number(invoice.marcaDaBollo) || 0,
    totale: Number(invoice.totale) || 0,
    stato: invoice.stato || 'bozza',
    note: invoice.note || null,
    modalita_pagamento: invoice.modalitaPagamento || null,
    scadenza_pagamento: invoice.scadenzaPagamento || null,
    xml_sdi: invoice.xmlString || null,
  }
}

/**
 * @param {object} row - prodotti row
 * @returns {object|null} product record for the app
 */
export function productToApp(row) {
  if (!row) {
    return null
  }

  return {
    id: row.id,
    nome: row.nome,
    categoria: row.categoria || '',
    unitaMisura: row.unita_misura || '',
    prezzo: toNumber(row.prezzo),
    descrizione: row.descrizione || '',
    attivo: row.attivo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
