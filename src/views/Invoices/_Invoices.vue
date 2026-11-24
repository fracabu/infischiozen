<script setup>
/**
 * Invoice list: filter by year and status, open an invoice.
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useFattureStore } from '../../stores/fatture'
import { formatEuro, formatData } from '../../lib/format'
import { clientName, invoiceNumber } from '../../lib/displayNames'
import { invoiceStatuses } from '../../lib/invoiceStatus'
import './_Invoices.css'

const router = useRouter()
const { t } = useI18n()
const store = useFattureStore()
const year = ref('')
const status = ref('')

onMounted(() => store.carica())

/** Years that have at least one numbered invoice, newest first. */
const years = computed(() => [...new Set(store.lista.map((invoice) => invoice.anno).filter(Boolean))].toSorted((a, b) => b - a))

const filtered = computed(() =>
  store.lista.filter(
    (invoice) =>
      (!year.value || String(invoice.anno) === String(year.value)) && (!status.value || invoice.stato === status.value),
  ),
)

/**
 * Open the detail page of an invoice.
 *
 * @param {object} invoice
 */
function openInvoice(invoice) {
  router.push({ name: 'fattura-dettaglio', params: { id: invoice.id } })
}

</script>

<template>
  <article data-part="invoices">
    <header data-part="page-header">
      <h1>{{ t('invoices.title') }}</h1>
      <menu data-part="actions">
        <li>
          <button type="button" @click="router.push({ name: 'fattura-registra' })">
            {{ t('invoices.registerExternal') }}
          </button>
        </li>
        <li>
          <button type="button" data-variant="primary" @click="router.push({ name: 'fattura-nuova' })">
            {{ t('invoices.new') }}
          </button>
        </li>
      </menu>
    </header>

    <search data-part="filters" :aria-label="t('invoices.filtersLabel')">
      <label for="invoices-year" data-visually-hidden>{{ t('invoices.yearLabel') }}</label>
      <select id="invoices-year" v-model="year">
        <option value="">
          {{ t('invoices.allYears') }}
        </option>
        <option v-for="option in years" :key="option" :value="option">
          {{ option }}
        </option>
      </select>
      <label for="invoices-status" data-visually-hidden>{{ t('invoices.statusLabel') }}</label>
      <select id="invoices-status" v-model="status">
        <option value="">
          {{ t('invoices.allStatuses') }}
        </option>
        <option v-for="option in invoiceStatuses" :key="option" :value="option">
          {{ t(`invoiceStatus.${option}`) }}
        </option>
      </select>
    </search>

    <section data-part="list" :aria-label="t('invoices.listLabel')">
      <table v-if="filtered.length > 0">
        <thead>
          <tr>
            <th scope="col">
              {{ t('invoices.column.number') }}
            </th>
            <th scope="col">
              {{ t('invoices.column.date') }}
            </th>
            <th scope="col">
              {{ t('invoices.column.client') }}
            </th>
            <th scope="col" data-align="end">
              {{ t('invoices.column.total') }}
            </th>
            <th scope="col">
              {{ t('invoices.column.status') }}
            </th>
            <th scope="col">
              {{ t('invoices.column.origin') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="invoice in filtered" :key="invoice.id" @click="openInvoice(invoice)">
            <th scope="row">
              <router-link :to="{ name: 'fattura-dettaglio', params: { id: invoice.id } }" @click.stop>
                {{ invoiceNumber(invoice) || t('invoiceStatus.bozza') }}
              </router-link>
            </th>
            <td>
              <time :datetime="invoice.data">{{ formatData(invoice.data) }}</time>
            </td>
            <td>{{ clientName(invoice.clienteSnapshot) || t('common.empty') }}</td>
            <td data-align="end">
              {{ formatEuro(invoice.totale) }}
            </td>
            <td>
              <span data-part="badge" :data-kind="invoice.stato">{{ t(`invoiceStatus.${invoice.stato}`) }}</span>
            </td>
            <td>
              <span data-part="badge" :data-kind="invoice.origine === 'esterna' ? 'esterna' : 'interna'">
                {{ t(`invoiceOrigin.${invoice.origine === 'esterna' ? 'esterna' : 'interna'}`) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else-if="store.lista.length > 0" data-part="empty">
        {{ t('invoices.noMatch') }}
      </p>
      <p v-else data-part="empty">
        {{ t('invoices.noneYet') }}
      </p>
    </section>
  </article>
</template>
