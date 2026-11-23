<script setup>
/**
 * Root layout: sidebar plus the routed page. On first launch (seller data
 * never confirmed) the dashboard redirects to the settings page.
 */
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { AppSidebar } from './components/AppSidebar'
import { useImpostazioniStore } from './stores/impostazioni'
import './App.css'

const router = useRouter()
const settings = useImpostazioniStore()

onMounted(async () => {
  await settings.carica()

  if (settings.primoAvvio && router.currentRoute.value.name === 'dashboard') {
    router.replace({ name: 'impostazioni', query: { benvenuto: '1' } })
  }
})
</script>

<template>
  <AppSidebar />
  <main data-part="page">
    <router-view />
  </main>
</template>
