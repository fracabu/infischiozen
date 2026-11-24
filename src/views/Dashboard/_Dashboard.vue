<script setup>
/**
 * Dashboard: figures for one year, taxable amount per month, running total,
 * client concentration and the latest invoices.
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useClientiStore } from '../../stores/clienti'
import { useFattureStore } from '../../stores/fatture'
import { formatEuro, formatData } from '../../lib/format'
import { clientName, invoiceNumber } from '../../lib/displayNames'
import {
  countedInvoices,
  invoicesOfYear,
  sumOf,
  monthlyTotals,
  runningTotals,
  totalsByClient,
  topShare,
  dashboardYears,
} from '../../lib/dashboardStats'
import './_Dashboard.css'

const RECENT_COUNT = 6
const router = useRouter()
const { t, locale } = useI18n()
const clientStore = useClientiStore()
const invoiceStore = useFattureStore()
const currentYear = new Date().getFullYear()
const year = ref(currentYear)

onMounted(() => Promise.all([clientStore.carica(), invoiceStore.carica()]))

const years = computed(() => dashboardYears(invoiceStore.lista, currentYear))
const counted = computed(() => countedInvoices(invoiceStore.lista))
const yearInvoices = computed(() => invoicesOfYear(counted.value, year.value))
const unpaid = computed(() => counted.value.filter((invoice) => invoice.stato !== 'pagata'))
const months = computed(() => monthlyTotals(yearInvoices.value))
const running = computed(() => runningTotals(months.value))
const clientTotals = computed(() => totalsByClient(yearInvoices.value))
const hasData = computed(() => months.value.some((value) => value > 0))
const recent = computed(() => invoiceStore.lista.slice(0, RECENT_COUNT))

/** Short month names in the UI language, January first. */
const monthNames = computed(() => {
  const format = new Intl.DateTimeFormat(locale.value, { month: 'short' })

  return months.value.map((_, index) => format.format(new Date(2000, index, 1)))
})

/**
 * Bar height on a 0-100 scale. A month with no amount keeps a thin base line.
 *
 * @param {number} value
 * @returns {number}
 */
function barHeight(value) {
  const max = Math.max(1, ...months.value)

  return Math.max(1, (value / max) * 100)
}

/** Points of the running total on a 100 x 100 canvas. */
const linePoints = computed(() => {
  const max = Math.max(1, ...running.value)
  const last = running.value.length - 1

  return running.value
    .map((value, index) => `${((index / last) * 100).toFixed(2)},${(100 - (value / max) * 100).toFixed(2)}`)
    .join(' ')
})

const areaPoints = computed(() => `0,100 ${linePoints.value} 100,100`)

</script>

<template>
  <article data-part="dashboard">
    <header data-part="page-header">
      <h1>{{ t('dashboard.title') }}</h1>
      <menu data-part="actions">
        <li>
          <label for="dashboard-year" data-visually-hidden>{{ t('dashboard.yearLabel') }}</label>
          <select id="dashboard-year" v-model="year">
            <option v-for="option in years" :key="option" :value="option">
              {{ option }}
            </option>
          </select>
        </li>
        <li>
          <button type="button" data-variant="primary" @click="router.push({ name: 'fattura-nuova' })">
            {{ t('dashboard.newInvoice') }}
          </button>
        </li>
      </menu>
    </header>

    <section data-part="stats" :aria-label="t('dashboard.summaryLabel', { year })">
      <dl data-part="card">
        <dt>{{ t('dashboard.clients') }}</dt>
        <dd>{{ clientStore.lista.length }}</dd>
      </dl>
      <dl data-part="card">
        <dt>{{ t('dashboard.invoices', { year }) }}</dt>
        <dd>{{ yearInvoices.length }}</dd>
      </dl>
      <dl data-part="card">
        <dt>{{ t('dashboard.taxable', { year }) }}</dt>
        <dd>{{ formatEuro(sumOf(yearInvoices, 'imponibile')) }}</dd>
      </dl>
      <dl data-part="card">
        <dt>{{ t('dashboard.documents', { year }) }}</dt>
        <dd>{{ formatEuro(sumOf(yearInvoices, 'totale')) }}</dd>
      </dl>
      <dl data-part="card">
        <dt>{{ t('dashboard.unpaid') }}</dt>
        <dd :data-state="unpaid.length > 0 ? 'warn' : undefined">
          {{ unpaid.length }}
        </dd>
      </dl>
    </section>

    <section data-part="charts">
      <section data-part="card" aria-labelledby="dashboard-monthly-title">
        <h2 id="dashboard-monthly-title">
          {{ t('dashboard.monthlyTitle', { year }) }}
        </h2>
        <ol v-if="hasData" data-part="bars">
          <li v-for="(value, index) in months" :key="index">
            <span data-part="month">{{ monthNames[index] }}</span>
            <data :value="value">{{ value ? formatEuro(value) : '' }}</data>
            <svg viewBox="0 0 10 100" preserveAspectRatio="none" aria-hidden="true">
              <rect x="0" :y="100 - barHeight(value)" width="10" :height="barHeight(value)" />
            </svg>
          </li>
        </ol>
        <p v-else data-part="no-data">
          {{ t('dashboard.noData', { year }) }}
        </p>
      </section>

      <section data-part="card" aria-labelledby="dashboard-running-title">
        <h2 id="dashboard-running-title">
          {{ t('dashboard.runningTitle', { year }) }}
        </h2>
        <figure v-if="hasData" data-part="line">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            role="img"
            :aria-label="t('dashboard.runningSummary', { year, amount: formatEuro(running.at(-1)) })"
          >
            <polygon :points="areaPoints" />
            <polyline :points="linePoints" />
          </svg>
          <ol data-part="axis" aria-hidden="true">
            <li v-for="name in monthNames" :key="name">
              {{ name }}
            </li>
          </ol>
        </figure>
        <p v-else data-part="no-data">
          {{ t('dashboard.noData', { year }) }}
        </p>
      </section>
    </section>

    <section data-part="stats" :aria-label="t('dashboard.concentrationLabel', { year })">
      <dl data-part="card">
        <dt>{{ t('dashboard.topClient', { year }) }}</dt>
        <dd>{{ t('dashboard.percent', { value: topShare(clientTotals, 1) }) }}</dd>
      </dl>
      <dl data-part="card">
        <dt>{{ t('dashboard.topThree', { year }) }}</dt>
        <dd>{{ t('dashboard.percent', { value: topShare(clientTotals, 3) }) }}</dd>
      </dl>
      <dl data-part="card">
        <dt>{{ t('dashboard.billedClients', { year }) }}</dt>
        <dd>{{ clientTotals.length }}</dd>
      </dl>
    </section>

    <section data-part="recent" aria-labelledby="dashboard-recent-title">
      <h2 id="dashboard-recent-title">
        {{ t('dashboard.recentTitle') }}
      </h2>
      <table v-if="recent.length > 0">
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
          <tr
            v-for="invoice in recent"
            :key="invoice.id"
            @click="router.push({ name: 'fattura-dettaglio', params: { id: invoice.id } })"
          >
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
      <p v-else data-part="empty">
        {{ t('dashboard.noneYet') }}
      </p>
    </section>
  </article>
</template>
