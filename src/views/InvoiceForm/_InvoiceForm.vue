<script setup>
/**
 * New invoice wizard in three steps: client, lines, summary. Each step checks
 * its own field of the zod schema in src/lib/invoiceDraft.js before the next
 * one opens. The last step saves a draft or issues the invoice.
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { useClientiStore } from '../../stores/clienti'
import { useProdottiStore } from '../../stores/prodotti'
import { useFattureStore } from '../../stores/fatture'
import { useImpostazioniStore } from '../../stores/impostazioni'
import { invoiceDraftSchema, emptyLine, buildInvoice } from '../../lib/invoiceDraft'
import { calcolaFattura, totaleRiga } from '../../lib/calcoloFattura'
import { formatEuro, oggiISO } from '../../lib/format'
import { clientName } from '../../lib/displayNames'
import { InvoiceLine } from '../../components/InvoiceLine'
import { InvoiceTotals } from '../../components/InvoiceTotals'
import './_InvoiceForm.css'

const router = useRouter()
const { t } = useI18n()
const clientStore = useClientiStore()
const productStore = useProdottiStore()
const invoiceStore = useFattureStore()
const settingsStore = useImpostazioniStore()
const steps = ['client', 'lines', 'summary']
const stepField = { 1: 'clienteId', 2: 'righe' }
const paymentMethods = ['Bonifico', 'PayPal', 'Contanti', 'Altro']
const step = ref(1)
const serverError = ref('')

const { defineField, handleSubmit, errors, isSubmitting, validateField, setFieldValue } = useForm({
  validationSchema: toTypedSchema(invoiceDraftSchema),
  initialValues: {
    clienteId: '',
    righe: [emptyLine()],
    data: oggiISO(),
    modalitaPagamento: 'Bonifico',
    scadenzaPagamento: '',
    note: '',
    applicaRivalsa: true,
  },
})

const options = { validateOnModelUpdate: false }
const [clientId, clientIdAttrs] = defineField('clienteId', options)
const [lines] = defineField('righe', options)
const [date, dateAttrs] = defineField('data', options)
const [payment, paymentAttrs] = defineField('modalitaPagamento', options)
const [dueDate, dueDateAttrs] = defineField('scadenzaPagamento', options)
const [notes, notesAttrs] = defineField('note', options)
const [applyRivalsa, applyRivalsaAttrs] = defineField('applicaRivalsa', options)

onMounted(async () => {
  await Promise.all([clientStore.carica(), productStore.carica(), settingsStore.carica()])
  // The rivalsa of one invoice starts from the default in the settings.
  setFieldValue('applicaRivalsa', Boolean(settingsStore.dati?.applicaRivalsaInps))
})

const settings = computed(() => settingsStore.dati || {})
const rivalsaPercent = computed(() => settings.value.percentualeRivalsaInps || 4)
const client = computed(() => clientStore.lista.find((item) => String(item.id) === String(clientId.value)))
const filledLines = computed(() => lines.value.filter((line) => line.descrizione))
// Only lines with a description are saved, so only they count (bug 20).
const amounts = computed(() => calcolaFattura(filledLines.value, { ...settings.value, applicaRivalsaInps: applyRivalsa.value }))

/** Error to show for the current step: a field error or a server error. */
const stepError = computed(() => {
  const field = step.value === 3 ? 'data' : stepField[step.value]

  return errors.value[field] ? t(errors.value[field]) : serverError.value
})

/**
 * Apply changed fields to one line.
 *
 * @param {number} index
 * @param {object} patch - changed fields only
 */
function updateLine(index, patch) {
  lines.value = lines.value.with(index, { ...lines.value[index], ...patch })
}

/**
 * Remove one line. The table always keeps one line.
 *
 * @param {number} index
 */
function removeLine(index) {
  const rest = lines.value.filter((_, position) => position !== index)

  lines.value = rest.length > 0 ? rest : [emptyLine()]
}

function addLine() {
  lines.value = [...lines.value, emptyLine()]
}

async function next() {
  serverError.value = ''

  const { valid } = await validateField(stepField[step.value])

  if (valid) {
    step.value += 1
  }
}

function back() {
  serverError.value = ''
  step.value -= 1
}

/**
 * Save the invoice as a draft or issue it, then open its detail page. A
 * server refusal, such as a date before the last invoice, shows as an error.
 *
 * @param {'draft'|'issue'} mode
 * @returns {Function} submit handler
 */
function submitAs(mode) {
  return handleSubmit(async (values) => {
    serverError.value = ''

    const invoice = buildInvoice(values, client.value, settings.value)

    try {
      const id = mode === 'issue' ? await invoiceStore.emetti(invoice) : await invoiceStore.salvaBozza(invoice)

      router.push({ name: 'fattura-dettaglio', params: { id } })
    } catch (error) {
      serverError.value = error instanceof Error ? error.message : String(error)
    }
  })
}

const saveDraft = submitAs('draft')
const issue = submitAs('issue')
</script>

<template>
  <article data-part="invoice-form">
    <header data-part="page-header">
      <h1>{{ t('invoiceForm.title') }}</h1>
      <button type="button" @click="router.push({ name: 'fatture' })">
        {{ t('common.cancel') }}
      </button>
    </header>

    <ol data-part="steps" :aria-label="t('invoiceForm.stepsLabel')">
      <li
        v-for="(name, index) in steps"
        :key="name"
        :aria-current="step === index + 1 ? 'step' : undefined"
        :data-state="step > index + 1 ? 'done' : undefined"
      >
        {{ t(`invoiceForm.step.${name}`) }}
      </li>
    </ol>

    <p v-if="stepError" role="alert" data-part="alert">
      {{ stepError }}
    </p>

    <form novalidate @submit.prevent>
      <section v-if="step === 1" data-part="card" aria-labelledby="invoice-client-title">
        <h2 id="invoice-client-title">
          {{ t('invoiceForm.clientTitle') }}
        </h2>
        <p v-if="clientStore.lista.length === 0" data-part="notice">
          {{ t('invoiceForm.noClients') }}
          <router-link :to="{ name: 'cliente-nuovo' }">
            {{ t('invoiceForm.createClient') }}
          </router-link>
        </p>
        <p v-else data-part="field" data-width="wide">
          <label for="invoice-client">
            {{ t('invoiceForm.client') }}
            <abbr :title="t('invoiceForm.required')">*</abbr>
          </label>
          <select
            id="invoice-client"
            v-model="clientId"
            v-bind="clientIdAttrs"
            aria-required="true"
            :aria-invalid="errors.clienteId ? 'true' : undefined"
          >
            <option value="">
              {{ t('invoiceForm.choose') }}
            </option>
            <option v-for="item in clientStore.lista" :key="item.id" :value="item.id">
              {{ clientName(item) }}
            </option>
          </select>
          <small data-part="hint">
            <router-link :to="{ name: 'cliente-nuovo' }">{{ t('invoiceForm.newClient') }}</router-link>
          </small>
        </p>
        <p v-if="client" data-part="client-card">
          <strong>{{ clientName(client) }}</strong><br>
          {{ client.indirizzo }}<br>
          {{ client.cap }} {{ client.citta }} ({{ client.provincia }})<br>
          <small>
            {{ client.partitaIVA ? t('invoiceForm.vatNumber', { value: client.partitaIVA }) : t('invoiceForm.taxCode', { value: client.codiceFiscale }) }}
          </small>
        </p>
      </section>

      <section v-if="step === 2" data-part="card" aria-labelledby="invoice-lines-title">
        <h2 id="invoice-lines-title">
          {{ t('invoiceForm.linesTitle') }}
        </h2>
        <table data-part="lines">
          <thead>
            <tr>
              <th scope="col">
                {{ t('invoiceLine.product') }}
              </th>
              <th scope="col">
                {{ t('invoiceLine.description') }}
              </th>
              <th scope="col">
                {{ t('invoiceLine.quantity') }}
              </th>
              <th scope="col">
                {{ t('invoiceLine.unitPrice') }}
              </th>
              <th scope="col" data-align="end">
                {{ t('invoiceLine.total') }}
              </th>
              <th scope="col">
                <span data-visually-hidden>{{ t('common.actions') }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <InvoiceLine
              v-for="(line, index) in lines"
              :key="index"
              :line="line"
              :number="index + 1"
              :products="productStore.attivi"
              @update="(changed) => updateLine(index, changed)"
              @remove="removeLine(index)"
            />
          </tbody>
        </table>
        <p>
          <button type="button" data-size="small" @click="addLine">
            {{ t('invoiceForm.addLine') }}
          </button>
        </p>
        <InvoiceTotals :amounts="amounts" />
      </section>

      <template v-if="step === 3">
        <fieldset data-part="card">
          <legend>{{ t('invoiceForm.documentTitle') }}</legend>
          <p data-part="field">
            <label for="invoice-date">
              {{ t('invoiceForm.date') }}
              <abbr :title="t('invoiceForm.required')">*</abbr>
            </label>
            <input
              id="invoice-date"
              v-model="date"
              v-bind="dateAttrs"
              type="date"
              aria-required="true"
              :aria-invalid="errors.data ? 'true' : undefined"
            >
          </p>
          <p data-part="field">
            <label for="invoice-payment">{{ t('invoiceForm.payment') }}</label>
            <select id="invoice-payment" v-model="payment" v-bind="paymentAttrs">
              <option v-for="method in paymentMethods" :key="method" :value="method">
                {{ t(`paymentMethod.${method}`) }}
              </option>
            </select>
          </p>
          <p data-part="field">
            <label for="invoice-due-date">{{ t('invoiceForm.dueDate') }}</label>
            <input id="invoice-due-date" v-model="dueDate" v-bind="dueDateAttrs" type="date">
          </p>
          <fieldset data-part="field">
            <legend>{{ t('invoiceForm.rivalsa') }}</legend>
            <label data-part="checkbox">
              <input v-model="applyRivalsa" v-bind="applyRivalsaAttrs" type="checkbox">
              {{ t('invoiceForm.applyRivalsa', { percent: rivalsaPercent }) }}
            </label>
          </fieldset>
          <p data-part="field" data-width="wide">
            <label for="invoice-notes">{{ t('invoiceForm.notes') }}</label>
            <textarea
              id="invoice-notes"
              v-model="notes"
              v-bind="notesAttrs"
              :placeholder="t('invoiceForm.notesPlaceholder')"
            />
          </p>
        </fieldset>

        <section data-part="card" aria-labelledby="invoice-summary-title">
          <h2 id="invoice-summary-title">
            {{ t('invoiceTotals.label') }}
          </h2>
          <table data-part="summary">
            <thead>
              <tr>
                <th scope="col">
                  {{ t('invoiceLine.description') }}
                </th>
                <th scope="col" data-align="end">
                  {{ t('invoiceLine.quantity') }}
                </th>
                <th scope="col" data-align="end">
                  {{ t('invoiceLine.unitPrice') }}
                </th>
                <th scope="col" data-align="end">
                  {{ t('invoiceLine.total') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(line, index) in filledLines" :key="index">
                <td>{{ line.descrizione }}</td>
                <td data-align="end">
                  {{ line.quantita }}
                </td>
                <td data-align="end">
                  {{ formatEuro(line.prezzoUnitario) }}
                </td>
                <td data-align="end">
                  {{ formatEuro(totaleRiga(line)) }}
                </td>
              </tr>
            </tbody>
          </table>
          <InvoiceTotals :amounts="amounts" document :rivalsa-percent="settings.percentualeRivalsaInps" />
        </section>
      </template>
    </form>

    <footer data-part="actions">
      <button v-if="step > 1" type="button" @click="back">
        {{ t('invoiceForm.back') }}
      </button>
      <button v-if="step < 3" type="button" data-variant="primary" @click="next">
        {{ t('invoiceForm.next') }}
      </button>
      <template v-if="step === 3">
        <button type="button" :disabled="isSubmitting" @click="saveDraft">
          {{ t('invoiceForm.saveDraft') }}
        </button>
        <button type="button" data-variant="primary" :disabled="isSubmitting" @click="issue">
          {{ isSubmitting ? t('invoiceForm.saving') : t('invoiceForm.issue') }}
        </button>
      </template>
    </footer>
  </article>
</template>
