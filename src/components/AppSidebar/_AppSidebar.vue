<script setup>
/**
 * App sidebar: brand, main navigation and footer.
 * The active entry is marked with aria-current="page", which is also the
 * styling hook (no class binding).
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  Squares2X2Icon,
  UsersIcon,
  CubeIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
} from '@heroicons/vue/24/outline'
import './_AppSidebar.css'

const route = useRoute()
const { t } = useI18n()

/** Navigation entries; `match` lists the route names that light the entry up. */
const entries = [
  { name: 'dashboard', labelKey: 'nav.dashboard', icon: Squares2X2Icon, match: ['dashboard'] },
  { name: 'clienti', labelKey: 'nav.clients', icon: UsersIcon, match: ['clienti', 'cliente-nuovo', 'cliente-modifica'] },
  { name: 'prodotti', labelKey: 'nav.products', icon: CubeIcon, match: ['prodotti', 'prodotto-nuovo', 'prodotto-modifica'] },
  { name: 'fatture', labelKey: 'nav.invoices', icon: DocumentTextIcon, match: ['fatture', 'fattura-nuova', 'fattura-registra', 'fattura-dettaglio'] },
  { name: 'impostazioni', labelKey: 'nav.settings', icon: Cog6ToothIcon, match: ['impostazioni'] },
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
        {{ t('app.name') }}
      </p>
      <p data-part="brand-tagline">
        {{ t('app.tagline') }}
      </p>
    </header>
    <nav data-part="navigation" :aria-label="t('app.mainNavigation')">
      <ul data-part="entries">
        <li v-for="entry in navigation" :key="entry.name">
          <router-link
            :to="{ name: entry.name }"
            :aria-current="entry.active ? 'page' : undefined"
          >
            <span data-part="icon" aria-hidden="true">
              <component :is="entry.icon" />
            </span>
            <span>{{ t(entry.labelKey) }}</span>
          </router-link>
        </li>
      </ul>
    </nav>
    <footer data-part="footer">
      <p>{{ t('app.name') }} &middot; {{ year }}</p>
      <p>{{ t('app.taxRegime') }}</p>
    </footer>
  </aside>
</template>
