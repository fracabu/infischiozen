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
 * @returns {number|undefined} the value as a number, undefined when it is missing
 */
const toNumber = (value) => (value === null || value === undefined ? undefined : Number(value))

/**
 * @param {object} row - clienti_fiscali row
 * @returns {object|undefined} client record for the app
 */
export function clientToApp(row) {
  if (!row) {
    return
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
    nome: client.nome || undefined,
    cognome: client.cognome || undefined,
    denominazione: client.ragioneSociale || undefined,
    nome_completo: fullName,
    codice_fiscale: client.codiceFiscale || undefined,
    partita_iva: client.partitaIVA || undefined,
    email: client.email || undefined,
    indirizzo: client.indirizzo || undefined,
    cap: client.cap || undefined,
    citta: client.citta || undefined,
    provincia: client.provincia || undefined,
    nazione: client.nazione || 'IT',
    codice_destinatario: client.codiceDestinatario || '0000000',
    pec: client.pec || undefined,
    telefono: client.telefono || undefined,
    note: client.note || undefined,
  }
}

/**
 * @param {object} row - fatture row
 * @returns {object|undefined} invoice record for the app
 */
export function invoiceToApp(row) {
  if (!row) {
    return
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
      prodottoId: line.prodottoId ?? line.prodotto_id,
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
    prodottoId: line.prodottoId,
    descrizione: line.descrizione || '',
    quantita: Number.isFinite(Number(line.quantita)) ? Number(line.quantita) : 1,
    prezzoUnitario: Number(line.prezzoUnitario) || 0,
    totaleRiga: Number(line.totaleRiga) || 0,
  }))

  return {
    data_emissione: invoice.data || undefined,
    cliente_id: invoice.clienteId,
    cliente_snapshot: invoice.clienteSnapshot || {},
    righe: lines,
    imponibile: Number(invoice.imponibile) || 0,
    applica_rivalsa: invoice.applicaRivalsaInps !== false,
    rivalsa_inps: Number(invoice.rivalsaInps) || 0,
    percentuale_rivalsa: Number(invoice.percentualeRivalsa ?? (invoice.rivalsaInps > 0 ? 4 : 0)),
    marca_da_bollo: Number(invoice.marcaDaBollo) || 0,
    totale: Number(invoice.totale) || 0,
    stato: invoice.stato || 'bozza',
    note: invoice.note || undefined,
    modalita_pagamento: invoice.modalitaPagamento || undefined,
    scadenza_pagamento: invoice.scadenzaPagamento || undefined,
    xml_sdi: invoice.xmlString || undefined,
  }
}

/**
 * @param {object} row - prodotti row
 * @returns {object|undefined} product record for the app
 */
export function productToApp(row) {
  if (!row) {
    return
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
