<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  Squares2X2Icon,
  UsersIcon,
  CubeIcon,
  DocumentTextIcon,
  Cog6ToothIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()

const voci = [
  { nome: 'dashboard', label: 'Dashboard', icona: Squares2X2Icon, match: ['dashboard'] },
  { nome: 'clienti', label: 'Clienti', icona: UsersIcon, match: ['clienti', 'cliente-nuovo', 'cliente-modifica'] },
  { nome: 'prodotti', label: 'Prodotti & Servizi', icona: CubeIcon, match: ['prodotti', 'prodotto-nuovo', 'prodotto-modifica'] },
  { nome: 'fatture', label: 'Fatture', icona: DocumentTextIcon, match: ['fatture', 'fattura-nuova', 'fattura-registra', 'fattura-dettaglio'] },
  { nome: 'impostazioni', label: 'Impostazioni', icona: Cog6ToothIcon, match: ['impostazioni'] }
]

const vociAttive = computed(() =>
  voci.map((v) => ({ ...v, attiva: v.match.includes(route.name) }))
)
const anno = new Date().getFullYear()
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-brand">
      <div class="marchio">infischiozen</div>
      <div class="sottotitolo">Gestionale</div>
    </div>
    <nav class="sidebar-nav">
      <router-link
        v-for="v in vociAttive"
        :key="v.nome"
        :to="{ name: v.nome }"
        :class="{ attivo: v.attiva }"
      >
        <component :is="v.icona" class="icona" />
        <span>{{ v.label }}</span>
      </router-link>
    </nav>
    <div class="sidebar-footer">
      infischiozen &middot; {{ anno }}<br />
      Regime forfettario
    </div>
  </aside>
</template>
