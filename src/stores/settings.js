/**
 * @module stores/settings
 * Seller settings from the API.
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '../lib/api'

/**
 * Settings store: one settings record, loaded once.
 */
export const useSettingsStore = defineStore('settings', () => {
  const data = ref(null)
  const loaded = ref(false)

  async function load() {
    if (loaded.value) {
      return data.value
    }

    data.value = await api.get('/impostazioni')
    loaded.value = true

    return data.value
  }

  async function save(settings) {
    data.value = await api.put('/impostazioni', settings)

    return data.value
  }

  /**
   * Number of the next invoice.
   *
   * It is NOT a counter that the app increments: the database computes it
   * from the invoice register, and the real number comes at issue time,
   * inside the INSERT. A counter kept by the app sooner or later drifts from
   * the real register.
   *
   * It only shows a preview of the number that the invoice will get.
   */
  async function nextNumber() {
    const fresh = await api.get('/impostazioni')
    data.value = fresh

    return { numero: fresh.prossimoNumeroFattura, anno: fresh.annoCorrente }
  }

  const isFirstLaunch = computed(() => !!data.value && !data.value.confermato)

  return { data, loaded, load, save, nextNumber, isFirstLaunch }
})
