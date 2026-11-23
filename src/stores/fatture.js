import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '../lib/api'

export const useFattureStore = defineStore('fatture', () => {
  const lista = ref([])
  const caricato = ref(false)

  async function carica() {
    lista.value = await api.get('/fatture')
    caricato.value = true

    return lista.value
  }

  async function get(id) {
    const f = await api.get(`/fatture/${Number(id)}`)

    // Il binario del PDF non sta nel JSON: si scarica solo se c'e' davvero.
    if (f?.pdfEsternoPresente) {
      f.pdfEsternoBlob = await api.getPdf(f.id)
    }

    return f
  }

  // Salva una fattura interna in bozza: nessun numero viene impegnato finche'
  // non si emette. Un numero assegnato a una bozza poi cancellata lascerebbe
  // un buco nella numerazione progressiva.
  async function salvaBozza(fattura) {
    const corpo = { ...fattura, origine: 'interna', stato: 'bozza' }

    const salvata = fattura.id
      ? await api.put(`/fatture/${fattura.id}`, corpo)
      : await api.post('/fatture', corpo)

    await carica()

    return salvata.id
  }

  // Registra una fattura emessa con un altro software: origine "esterna".
  async function salvaEsterna(fattura) {
    const { pdfEsternoBlob, ...resto } = fattura
    const corpo = { ...resto, origine: 'esterna', stato: fattura.stato || 'pagata' }

    const salvata = fattura.id
      ? await api.put(`/fatture/${fattura.id}`, corpo)
      : await api.post('/fatture', corpo)

    if (pdfEsternoBlob) {
      await api.putPdf(salvata.id, pdfEsternoBlob)
    }

    await carica()

    return salvata.id
  }

  // Emette una fattura. Il numero lo assegna il DATABASE nella stessa
  // istruzione che scrive la riga: e' l'unico modo per garantire che la
  // numerazione resti progressiva e senza doppioni.
  async function emetti(fattura) {
    const corpo = {
      ...fattura,
      origine: 'interna',
      stato: 'emessa',
      anno: fattura.anno || new Date(fattura.data || Date.now()).getFullYear(),
    }

    const salvata = fattura.id
      ? await api.put(`/fatture/${fattura.id}`, corpo)
      : await api.post('/fatture', corpo)

    await carica()

    return salvata.id
  }

  async function cambiaStato(id, stato) {
    await api.patch(`/fatture/${Number(id)}/stato`, { stato })
    await carica()
  }

  async function salvaXml(id, xmlString) {
    const f = await api.get(`/fatture/${Number(id)}`)

    if (!f) {
      return
    }

    await api.put(`/fatture/${f.id}`, { ...f, xmlString })
    await carica()
  }

  async function allegaPdfEsterno(id, blob) {
    await api.putPdf(Number(id), blob)
    await carica()
  }

  async function elimina(id) {
    await api.del(`/fatture/${Number(id)}`)
    await carica()
  }

  /**
   * PUNTO DI ESTENSIONE — invio al Sistema di Interscambio (SdI).
   * L'Agenzia delle Entrate non espone API dirette e il cassetto fiscale non e'
   * un canale di invio. Le strade praticabili sono tre: caricare l'XML a mano
   * sul portale Fatture e Corrispettivi; inviarlo via PEC a sdi01@pec.fatturapa.it
   * (automatizzabile, non richiede accreditamento); accreditarsi come
   * intermediario su SDICoop. Per ora nessuna e' implementata.
   */
  async function inviaSdI() {
    throw new Error('Invio SdI non ancora disponibile')
  }

  return {
    lista,
    caricato,
    carica,
    get,
    salvaBozza,
    salvaEsterna,
    emetti,
    cambiaStato,
    salvaXml,
    allegaPdfEsterno,
    elimina,
    inviaSdI
  }
})
