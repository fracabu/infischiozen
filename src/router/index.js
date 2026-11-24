import { createRouter, createWebHistory } from 'vue-router'

/**
 * Lazy route component taken from a barrel export.
 *
 * @param {() => Promise<object>} load - dynamic import of the barrel
 * @param {string} name - export name of the component
 * @returns {() => Promise<object>}
 */
function lazy(load, name) {
  return async () => {
    const exports = await load()

    return exports[name]
  }
}

const routes = [
  { path: '/', name: 'dashboard', component: () => import('../views/Dashboard.vue') },
  { path: '/clienti', name: 'clienti', component: lazy(() => import('../views/Clients'), 'Clients') },
  { path: '/clienti/nuovo', name: 'cliente-nuovo', component: lazy(() => import('../views/ClientForm'), 'ClientForm') },
  { path: '/clienti/:id', name: 'cliente-modifica', component: lazy(() => import('../views/ClientForm'), 'ClientForm') },
  { path: '/prodotti', name: 'prodotti', component: () => import('../views/Prodotti.vue') },
  { path: '/prodotti/nuovo', name: 'prodotto-nuovo', component: () => import('../views/ProdottoForm.vue') },
  { path: '/prodotti/:id', name: 'prodotto-modifica', component: () => import('../views/ProdottoForm.vue'), props: true },
  { path: '/fatture', name: 'fatture', component: () => import('../views/Fatture.vue') },
  { path: '/fatture/nuova', name: 'fattura-nuova', component: () => import('../views/FatturaNuova.vue') },
  { path: '/fatture/registra', name: 'fattura-registra', component: () => import('../views/FatturaEsterna.vue') },
  { path: '/fatture/:id', name: 'fattura-dettaglio', component: () => import('../views/FatturaDettaglio.vue'), props: true },
  { path: '/impostazioni', name: 'impostazioni', component: () => import('../views/Impostazioni.vue') }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

export default router
