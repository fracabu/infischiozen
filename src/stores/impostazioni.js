import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '../lib/api'

export const useImpostazioniStore = defineStore('impostazioni', () => {
  const dati = ref(null)
  const caricato = ref(false)

  async function carica() {
    if (caricato.value) {
      return dati.value
    }

    dati.value = await api.get('/impostazioni')
    caricato.value = true

    return dati.value
  }

  async function salva(nuoviDati) {
    dati.value = await api.put('/impostazioni', nuoviDati)

    return dati.value
  }

  /**
   * Il numero della prossima fattura.
   *
   * NON e' piu' un contatore che l'app incrementa: lo calcola il database dal
   * registro delle fatture, e l'assegnazione vera avviene al momento
   * dell'emissione, dentro l'INSERT. Un contatore tenuto dall'applicazione
   * prima o poi diverge dal registro reale delle fatture.
   *
   * Serve solo a mostrare in anteprima il numero che verra' assegnato.
   */
  async function prossimoNumero() {
    const aggiornati = await api.get('/impostazioni')
    dati.value = aggiornati

    return { numero: aggiornati.prossimoNumeroFattura, anno: aggiornati.annoCorrente }
  }

  const primoAvvio = computed(() => !!dati.value && !dati.value.confermato)

  return { dati, caricato, carica, salva, prossimoNumero, primoAvvio }
})
