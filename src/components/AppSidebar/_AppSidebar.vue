<script setup>
/**
 * App sidebar: brand, main navigation and footer.
 * The active entry is marked with aria-current="page", which is also the
 * styling hook (no class binding).
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  Squares2X2Icon,
  UsersIcon,
  CubeIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
} from '@heroicons/vue/24/outline'
import './_AppSidebar.css'

const route = useRoute()

/** Navigation entries; `match` lists the route names that light the entry up. */
const entries = [
  { name: 'dashboard', label: 'Dashboard', icon: Squares2X2Icon, match: ['dashboard'] },
  { name: 'clienti', label: 'Clienti', icon: UsersIcon, match: ['clienti', 'cliente-nuovo', 'cliente-modifica'] },
  { name: 'prodotti', label: 'Prodotti & Servizi', icon: CubeIcon, match: ['prodotti', 'prodotto-nuovo', 'prodotto-modifica'] },
  { name: 'fatture', label: 'Fatture', icon: DocumentTextIcon, match: ['fatture', 'fattura-nuova', 'fattura-registra', 'fattura-dettaglio'] },
  { name: 'impostazioni', label: 'Impostazioni', icon: Cog6ToothIcon, match: ['impostazioni'] },
]

const navigation = computed(() =>
  entries.map((entry) => ({ ...entry, active: entry.match.includes(route.name) })),
)

const year = new Date().getFullYear()
</script>

<template>
  <aside data-part="sidebar">
    <header data-part="brand">
      <p data-part="brand-name">
        infischiozen
      </p>
      <p data-part="brand-tagline">
        Gestionale
      </p>
    </header>
    <nav data-part="navigation" aria-label="Navigazione principale">
      <ul data-part="entries">
        <li v-for="entry in navigation" :key="entry.name">
          <router-link
            :to="{ name: entry.name }"
            :aria-current="entry.active ? 'page' : undefined"
          >
            <span data-part="icon" aria-hidden="true">
              <component :is="entry.icon" />
            </span>
            <span>{{ entry.label }}</span>
          </router-link>
        </li>
      </ul>
    </nav>
    <footer data-part="footer">
      <p>infischiozen &middot; {{ year }}</p>
      <p>Regime forfettario</p>
    </footer>
  </aside>
</template>
