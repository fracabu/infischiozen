<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppSidebar from './components/AppSidebar.vue'
import { useImpostazioniStore } from './stores/impostazioni'

const router = useRouter()
const impostazioni = useImpostazioniStore()

onMounted(async () => {
  await impostazioni.carica()
  // Se i dati cedente non sono mai stati confermati, suggerisci Impostazioni.
  if (impostazioni.primoAvvio && router.currentRoute.value.name === 'dashboard') {
    router.replace({ name: 'impostazioni', query: { benvenuto: '1' } })
  }
})
</script>

<template>
  <div class="app-layout">
    <AppSidebar />
    <main class="app-main">
      <router-view />
    </main>
  </div>
</template>
