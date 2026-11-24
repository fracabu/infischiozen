/**
 * @module stores/products
 * Catalog products from the API.
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '../lib/api'

/**
 * Product store: the list, the active products, plus read, save and delete.
 */
export const useProductsStore = defineStore('products', () => {
  const list = ref([])
  const loaded = ref(false)

  const active = computed(() => list.value.filter((product) => product.attivo))

  async function load() {
    list.value = await api.get('/prodotti')
    loaded.value = true

    return list.value
  }

  async function get(id) {
    const productId = Number(id)

    if (!loaded.value) {
      await load()
    }

    return list.value.find((product) => product.id === productId)
  }

  async function save(product) {
    if (product.id) {
      await api.put(`/prodotti/${product.id}`, product)
    } else {
      await api.post('/prodotti', product)
    }

    await load()
  }

  async function remove(id) {
    await api.del(`/prodotti/${Number(id)}`)
    await load()
  }

  return { list, active, loaded, load, get, save, remove }
})
