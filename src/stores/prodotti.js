import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '../lib/api'

export const useProdottiStore = defineStore('prodotti', () => {
  const lista = ref([])
  const caricato = ref(false)

  const attivi = computed(() => lista.value.filter((p) => p.attivo))

  async function carica() {
    lista.value = await api.get('/prodotti')
    caricato.value = true

    return lista.value
  }

  async function get(id) {
    const n = Number(id)

    if (!caricato.value) {
      await carica()
    }

    return lista.value.find((p) => p.id === n) || null
  }

  async function salva(prodotto) {
    if (prodotto.id) {
      await api.put(`/prodotti/${prodotto.id}`, prodotto)
    } else {
      await api.post('/prodotti', prodotto)
    }

    await carica()
  }

  async function elimina(id) {
    await api.del(`/prodotti/${Number(id)}`)
    await carica()
  }

  return { lista, attivi, caricato, carica, get, salva, elimina }
})
