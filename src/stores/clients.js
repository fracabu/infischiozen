/**
 * @module stores/clients
 * Client records from the API.
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '../lib/api'

/**
 * Client store: the list, plus read, save and delete of one client.
 */
export const useClientsStore = defineStore('clients', () => {
  const list = ref([])
  const loaded = ref(false)

  async function load() {
    list.value = await api.get('/clienti')
    loaded.value = true

    return list.value
  }

  async function get(id) {
    return api.get(`/clienti/${Number(id)}`)
  }

  async function save(client) {
    const saved = client.id
      ? await api.put(`/clienti/${client.id}`, client)
      : await api.post('/clienti', client)

    await load()

    return saved
  }

  async function remove(id) {
    await api.del(`/clienti/${Number(id)}`)
    await load()
  }

  return { list, loaded, load, get, save, remove }
})
