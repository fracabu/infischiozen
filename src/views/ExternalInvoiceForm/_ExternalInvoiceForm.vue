<script setup>
/**
 * Register an invoice issued with another software. vee-validate runs the
 * zod schema of src/lib/externalInvoice.js. The year of the number comes
 * from the date, as the server does.
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { useClientsStore } from '../../stores/clients'
import { useInvoicesStore } from '../../stores/invoices'
import { useSettingsStore } from '../../stores/settings'
import { externalInvoiceSchema, externalStatuses, buildExternalInvoice } from '../../lib/externalInvoice'
import { emptyLine } from '../../lib/invoiceDraft'
import { computeInvoice } from '../../lib/invoiceMath'
import { todayIso } from '../../lib/format'
import { clientName } from '../../lib/displayNames'
import { InvoiceLines } from '../../components/InvoiceLines'
import { InvoiceTotals } from '../../components/InvoiceTotals'
import './_ExternalInvoiceForm.css'

const router = useRouter()
const { t } = useI18n()
const clientStore = useClientsStore()
const invoiceStore = useInvoicesStore()
const settingsStore = useSettingsStore()
const paymentMethods = ['Bonifico', 'PayPal', 'Contanti', 'Altro']
const fieldOrder = ['numero', 'data', 'stato', 'clienteId', 'righe']
const serverError = ref('')
const pdf = ref()
const pdfInput = ref()

const { defineField, handleSubmit, errors, isSubmitting, submitCount, setFieldValue } = useForm({
  validationSchema: toTypedSchema(externalInvoiceSchema),
  initialValues: {
    numero: '',
    data: todayIso(),
    stato: 'pagata',
    clienteId: '',
    righe: [emptyLine()],
    modalitaPagamento: 'Bonifico',
    note: '',
    applicaRivalsa: true,
  },
})

const options = { validateOnModelUpdate: false }
const [number, numberAttrs] = defineField('numero', options)
const [date, dateAttrs] = defineField('data', options)
const [status, statusAttrs] = defineField('stato', options)
const [payment, paymentAttrs] = defineField('modalitaPagamento', options)
const [clientId, clientIdAttrs] = defineField('clienteId', options)
const [lines] = defineField('righe', options)
const [applyRivalsa, applyRivalsaAttrs] = defineField('applicaRivalsa', options)
const [notes, notesAttrs] = defineField('note', options)

onMounted(async () => {
  await Promise.all([clientStore.load(), settingsStore.load()])
  // The rivalsa of one invoice starts from the default in the settings.
  setFieldValue('applicaRivalsa', Boolean(settingsStore.data?.applicaRivalsaInps))
})

const settings = computed(() => settingsStore.data || {})
const client = computed(() => clientStore.list.find((item) => String(item.id) === String(clientId.value)))
const filledLines = computed(() => lines.value.filter((line) => line.descrizione))
// Only lines with a description are saved, so only they count (bug 20).
const amounts = computed(() => computeInvoice(filledLines.value, { ...settings.value, applicaRivalsaInps: applyRivalsa.value }))
const year = computed(() => String(date.value || '').slice(0, 4))
const hasErrors = computed(() => submitCount.value > 0 && Object.keys(errors.value).length > 0)

/**
 * Translated error of a field, if any.
 *
 * @param {string} field
 * @returns {string}
 */
function errorOf(field) {
  return errors.value[field] ? t(errors.value[field]) : ''
}

/**
 * Keep the chosen PDF file.
 *
 * @param {Event} event
 */
function pickPdf(event) {
  pdf.value = event.target.files[0]
}

function removePdf() {
  pdf.value = undefined
  pdfInput.value.value = ''
}

/** Move focus to the first field with an error. */
function focusFirstError({ errors: fieldErrors }) {
  const first = fieldOrder.find((field) => fieldErrors[field])

  document.getElementById(`external-${first}`)?.focus()
}

const onSubmit = handleSubmit(async (values) => {
  serverError.value = ''

  try {
    const id = await invoiceStore.saveExternal(buildExternalInvoice(values, client.value, settings.value, pdf.value))

    router.push({ name: 'fattura-dettaglio', params: { id } })
  } catch (error) {
    serverError.value = error instanceof Error ? error.message : String(error)
  }
}, focusFirstError)
</script>

<template>
  <article data-part="external-invoice-form">
    <header data-part="page-header">
      <h1>{{ t('externalForm.title') }}</h1>
      <button type="button" @click="router.push({ name: 'fatture' })">
        {{ t('common.cancel') }}
      </button>
    </header>

    <p data-part="info">
      {{ t('externalForm.info') }}
    </p>

    <p v-if="serverError || hasErrors" role="alert" data-part="alert">
      {{ serverError || t('externalForm.invalid') }}
    </p>

    <form id="external-invoice-form" novalidate @submit="onSubmit">
      <fieldset data-part="card">
        <legend>{{ t('externalForm.documentTitle') }}</legend>
        <p data-part="field">
          <label for="external-numero">
            {{ t('externalForm.number') }}
            <abbr :title="t('invoiceForm.required')">*</abbr>
          </label>
          <input
            id="external-numero"
            v-model="number"
            v-bind="numberAttrs"
            type="number"
            min="1"
            step="1"
            aria-required="true"
            :aria-invalid="errors.numero ? 'true' : undefined"
            aria-describedby="external-numero-note"
          >
          <small id="external-numero-note" :data-part="errors.numero ? 'error' : 'hint'">
            {{ errorOf('numero') || t('externalForm.numberHint', { number: number || '?', year }) }}
          </small>
        </p>
        <p data-part="field">
          <label for="external-data">
            {{ t('externalForm.date') }}
            <abbr :title="t('invoiceForm.required')">*</abbr>
          </label>
          <input
            id="external-data"
            v-model="date"
            v-bind="dateAttrs"
            type="date"
            aria-required="true"
            :aria-invalid="errors.data ? 'true' : undefined"
            :aria-describedby="errors.data ? 'external-data-error' : undefined"
          >
          <small v-if="errors.data" id="external-data-error" data-part="error">{{ errorOf('data') }}</small>
        </p>
        <p data-part="field">
          <label for="external-stato">{{ t('externalForm.status') }}</label>
          <select id="external-stato" v-model="status" v-bind="statusAttrs" :aria-invalid="errors.stato ? 'true' : undefined">
            <option v-for="option in externalStatuses" :key="option" :value="option">
              {{ t(`invoiceStatus.${option}`) }}
            </option>
          </select>
        </p>
        <p data-part="field">
          <label for="external-payment">{{ t('invoiceForm.payment') }}</label>
          <select id="external-payment" v-model="payment" v-bind="paymentAttrs">
            <option v-for="method in paymentMethods" :key="method" :value="method">
              {{ t(`paymentMethod.${method}`) }}
            </option>
          </select>
        </p>
      </fieldset>

      <fieldset data-part="card">
        <legend>{{ t('externalForm.clientTitle') }}</legend>
        <p v-if="clientStore.list.length === 0" data-part="notice">
          {{ t('invoiceForm.noClients') }}
          <router-link :to="{ name: 'cliente-nuovo' }">
            {{ t('invoiceForm.createClient') }}
          </router-link>
        </p>
        <p v-else data-part="field" data-width="wide">
          <label for="external-clienteId">
            {{ t('invoiceForm.client') }}
            <abbr :title="t('invoiceForm.required')">*</abbr>
          </label>
          <select
            id="external-clienteId"
            v-model="clientId"
            v-bind="clientIdAttrs"
            aria-required="true"
            :aria-invalid="errors.clienteId ? 'true' : undefined"
            :aria-describedby="errors.clienteId ? 'external-clienteId-error' : undefined"
          >
            <option value="">
              {{ t('invoiceForm.choose') }}
            </option>
            <option v-for="item in clientStore.list" :key="item.id" :value="item.id">
              {{ clientName(item) }}
            </option>
          </select>
          <small v-if="errors.clienteId" id="external-clienteId-error" data-part="error">{{ errorOf('clienteId') }}</small>
          <small v-else data-part="hint">
            <router-link :to="{ name: 'cliente-nuovo' }">{{ t('invoiceForm.newClient') }}</router-link>
          </small>
        </p>
      </fieldset>

      <section data-part="card" aria-labelledby="external-lines-title">
        <h2 id="external-lines-title">
          {{ t('externalForm.linesTitle') }}
        </h2>
        <InvoiceLines v-model="lines" />
        <p v-if="errors.righe" id="external-righe" data-part="error" tabindex="-1">
          {{ errorOf('righe') }}
        </p>
        <fieldset data-part="field">
          <legend>{{ t('invoiceForm.rivalsa') }}</legend>
          <label data-part="checkbox">
            <input v-model="applyRivalsa" v-bind="applyRivalsaAttrs" type="checkbox">
            {{ t('invoiceForm.applyRivalsa', { percent: settings.percentualeRivalsaInps || 4 }) }}
          </label>
        </fieldset>
        <InvoiceTotals :amounts="amounts" />
      </section>

      <fieldset data-part="card">
        <legend>{{ t('externalForm.pdfTitle') }}</legend>
        <p data-part="field" data-width="wide">
          <label for="external-pdf">{{ t('externalForm.pdf') }}</label>
          <input
            id="external-pdf"
            ref="pdfInput"
            type="file"
            accept="application/pdf"
            aria-describedby="external-pdf-hint"
            @change="pickPdf"
          >
          <small id="external-pdf-hint" data-part="hint">{{ t('externalForm.pdfHint') }}</small>
        </p>
        <p v-if="pdf">
          <button type="button" data-size="small" @click="removePdf">
            {{ t('externalForm.removePdf') }}
          </button>
        </p>
      </fieldset>

      <fieldset data-part="card">
        <legend>{{ t('externalForm.notesTitle') }}</legend>
        <p data-part="field" data-width="wide">
          <label for="external-note" data-visually-hidden>{{ t('externalForm.notesTitle') }}</label>
          <textarea
            id="external-note"
            v-model="notes"
            v-bind="notesAttrs"
            :placeholder="t('externalForm.notesPlaceholder')"
          />
        </p>
      </fieldset>
    </form>

    <footer data-part="actions">
      <button type="button" @click="router.push({ name: 'fatture' })">
        {{ t('common.cancel') }}
      </button>
      <button type="submit" form="external-invoice-form" data-variant="primary" :disabled="isSubmitting">
        {{ isSubmitting ? t('invoiceForm.saving') : t('externalForm.save') }}
      </button>
    </footer>
  </article>
</template>
