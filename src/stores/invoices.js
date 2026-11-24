/**
 * @module stores/invoices
 * Invoices from the API: drafts, issued invoices and external invoices.
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '../lib/api'

/**
 * Invoice store: the list, plus the calls that save, issue, change and
 * delete one invoice.
 */
export const useInvoicesStore = defineStore('invoices', () => {
  const list = ref([])
  const loaded = ref(false)

  async function load() {
    list.value = await api.get('/fatture')
    loaded.value = true

    return list.value
  }

  async function get(id) {
    const invoice = await api.get(`/fatture/${Number(id)}`)

    // The PDF binary is not in the JSON: download it only when it exists.
    if (invoice?.pdfEsternoPresente) {
      invoice.pdfEsternoBlob = await api.getPdf(invoice.id)
    }

    return invoice
  }

  // Save an internal invoice as a draft: no number is taken until the invoice
  // is issued. A number given to a draft that is later deleted would leave a
  // gap in the progressive numbering.
  async function saveDraft(invoice) {
    const body = { ...invoice, origine: 'interna', stato: 'bozza' }

    const saved = invoice.id
      ? await api.put(`/fatture/${invoice.id}`, body)
      : await api.post('/fatture', body)

    await load()

    return saved.id
  }

  // Record an invoice issued with other software: origin "esterna".
  async function saveExternal(invoice) {
    const { pdfEsternoBlob, ...rest } = invoice
    const body = { ...rest, origine: 'esterna', stato: invoice.stato || 'pagata' }

    const saved = invoice.id
      ? await api.put(`/fatture/${invoice.id}`, body)
      : await api.post('/fatture', body)

    if (pdfEsternoBlob) {
      await api.putPdf(saved.id, pdfEsternoBlob)
    }

    await load()

    return saved.id
  }

  // Issue an invoice. The DATABASE gives the number, in the same statement
  // that writes the row: that is the only way to keep the numbering
  // progressive and without duplicates.
  async function issue(invoice) {
    const body = {
      ...invoice,
      origine: 'interna',
      stato: 'emessa',
      anno: invoice.anno || new Date(invoice.data || Date.now()).getFullYear(),
    }

    const saved = invoice.id
      ? await api.put(`/fatture/${invoice.id}`, body)
      : await api.post('/fatture', body)

    await load()

    return saved.id
  }

  async function setStatus(id, status) {
    await api.patch(`/fatture/${Number(id)}/stato`, { stato: status })
    await load()
  }

  async function saveXml(id, xmlString) {
    const invoice = await api.get(`/fatture/${Number(id)}`)

    if (!invoice) {
      return
    }

    await api.put(`/fatture/${invoice.id}`, { ...invoice, xmlString })
    await load()
  }

  async function attachExternalPdf(id, blob) {
    await api.putPdf(Number(id), blob)
    await load()
  }

  async function remove(id) {
    await api.del(`/fatture/${Number(id)}`)
    await load()
  }

  /**
   * EXTENSION POINT: send to the Interchange System (SdI).
   * The tax agency has no direct API, and the tax drawer (cassetto fiscale) is
   * not a send channel. There are three ways: upload the XML by hand on the
   * Fatture e Corrispettivi portal; send it by PEC to sdi01@pec.fatturapa.it
   * (can be automated, needs no accreditation); get accredited as an
   * intermediary on SDICoop. None is in place yet.
   */
  async function sendToSdi() {
    throw new Error('Invio SdI non ancora disponibile')
  }

  return {
    list,
    loaded,
    load,
    get,
    saveDraft,
    saveExternal,
    issue,
    setStatus,
    saveXml,
    attachExternalPdf,
    remove,
    sendToSdi
  }
})
