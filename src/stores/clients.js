/**
 * @module stores/clients
 * Client records from the API.
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '../lib/api'

/**
 * Read one client from the API.
 *
 * @param {number|string} id
 * @returns {Promise<object>} the client record
 */
async function getClient(id) {
  return api.get(`/clienti/${Number(id)}`)
}

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

  return { list, loaded, load, get: getClient, save, remove }
})
