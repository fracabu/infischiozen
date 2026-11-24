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
  { path: '/', name: 'dashboard', component: lazy(() => import('../views/Dashboard'), 'Dashboard') },
  { path: '/clienti', name: 'clienti', component: lazy(() => import('../views/Clients'), 'Clients') },
  { path: '/clienti/nuovo', name: 'cliente-nuovo', component: lazy(() => import('../views/ClientForm'), 'ClientForm') },
  { path: '/clienti/:id', name: 'cliente-modifica', component: lazy(() => import('../views/ClientForm'), 'ClientForm') },
  { path: '/prodotti', name: 'prodotti', component: lazy(() => import('../views/Products'), 'Products') },
  { path: '/prodotti/nuovo', name: 'prodotto-nuovo', component: lazy(() => import('../views/ProductForm'), 'ProductForm') },
  { path: '/prodotti/:id', name: 'prodotto-modifica', component: lazy(() => import('../views/ProductForm'), 'ProductForm') },
  { path: '/fatture', name: 'fatture', component: lazy(() => import('../views/Invoices'), 'Invoices') },
  { path: '/fatture/nuova', name: 'fattura-nuova', component: lazy(() => import('../views/InvoiceForm'), 'InvoiceForm') },
  { path: '/fatture/registra', name: 'fattura-registra', component: lazy(() => import('../views/ExternalInvoiceForm'), 'ExternalInvoiceForm') },
  { path: '/fatture/:id', name: 'fattura-dettaglio', component: lazy(() => import('../views/InvoiceDetail'), 'InvoiceDetail') },
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
