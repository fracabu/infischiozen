<script setup>
/**
 * Root layout: sidebar plus the routed page. On first launch (seller data
 * never confirmed) the dashboard redirects to the settings page.
 */
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { AppSidebar } from './components/AppSidebar'
import { useSettingsStore } from './stores/settings'
import './App.css'

const router = useRouter()
const settings = useSettingsStore()

onMounted(async () => {
  // The first navigation loads its page lazily: wait for it, or the route has no name yet.
  await Promise.all([settings.load(), router.isReady()])

  if (settings.isFirstLaunch && router.currentRoute.value.name === 'dashboard') {
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
