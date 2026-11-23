import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '../lib/api'

export const useClientiStore = defineStore('clienti', () => {
  const lista = ref([])
  const caricato = ref(false)

  async function carica() {
    lista.value = await api.get('/clienti')
    caricato.value = true

    return lista.value
  }

  async function get(id) {
    return api.get(`/clienti/${Number(id)}`)
  }

  async function salva(cliente) {
    const salvato = cliente.id
      ? await api.put(`/clienti/${cliente.id}`, cliente)
      : await api.post('/clienti', cliente)

    await carica()

    return salvato
  }

  async function elimina(id) {
    await api.del(`/clienti/${Number(id)}`)
    await carica()
  }

  return { lista, caricato, carica, get, salva, elimina }
})
