<script setup>
/**
 * Invoice detail: documents to download, status changes, client and document
 * data, lines, totals and legal text. An external invoice has no PDF or XML of
 * its own: it shows the attached PDF instead.
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useInvoicesStore } from '../../stores/invoices'
import { useSettingsStore } from '../../stores/settings'
import { formatEuro, formatDate } from '../../lib/format'
import { downloadInvoicePdf } from '../../lib/invoicePdf'
import { buildInvoiceXml, checkXmlFields, xmlFileName } from '../../lib/invoiceXml'
import { clientName, invoiceNumber } from '../../lib/displayNames'
import { nextStatuses } from '../../lib/invoiceStatus'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { InvoiceTotals } from '../../components/InvoiceTotals'
import './_InvoiceDetail.css'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const invoiceStore = useInvoicesStore()
const settingsStore = useSettingsStore()
const invoice = ref()
const message = ref('')
const xmlErrors = ref([])
const confirmDelete = ref(false)

onMounted(async () => {
  await settingsStore.load()
  invoice.value = await invoiceStore.get(route.params.id)

  if (!invoice.value) {
    router.replace({ name: 'fatture' })
  }
})

const settings = computed(() => settingsStore.data || {})
const isDraft = computed(() => invoice.value?.stato === 'bozza')
const isExternal = computed(() => invoice.value?.origine === 'esterna')
const client = computed(() => invoice.value?.clienteSnapshot || {})
const statuses = computed(() => nextStatuses(invoice.value?.stato))

/**
 * Hand a file to the browser as a download.
 *
 * @param {Blob} blob
 * @param {string} name
 */
function saveFile(blob, name) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Show an error from a failed action.
 *
 * @param {unknown} error
 */
function showError(error) {
  message.value = error instanceof Error ? error.message : String(error)
}

async function reload() {
  invoice.value = await invoiceStore.get(invoice.value.id)
}

async function downloadPdf() {
  message.value = ''

  try {
    await downloadInvoicePdf(invoice.value, settings.value)
  } catch (error) {
    message.value = t('invoiceDetail.pdfError', { message: error instanceof Error ? error.message : String(error) })
  }
}

/**
 * Check the XML fields, then download the XML. The first download stores the
 * XML on the invoice.
 */
async function downloadXml() {
  message.value = ''
  xmlErrors.value = checkXmlFields(invoice.value, settings.value)

  if (xmlErrors.value.length > 0) {
    return
  }

  const xml = buildInvoiceXml(invoice.value, settings.value)

  try {
    if (!invoice.value.xmlString) {
      await invoiceStore.saveXml(invoice.value.id, xml)
      invoice.value.xmlString = xml
    }

    saveFile(new Blob([xml], { type: 'application/xml' }), xmlFileName(invoice.value, settings.value))
  } catch (error) {
    showError(error)
  }
}

/**
 * Move the invoice to another status. A draft gets its number only by being
 * issued, so issuing a draft goes through the issue call.
 *
 * @param {string} status
 */
async function changeStatus(status) {
  message.value = ''

  try {
    await (status === 'emessa' && !invoice.value.numero
      ? invoiceStore.issue(invoice.value)
      : invoiceStore.setStatus(invoice.value.id, status))
    await reload()
  } catch (error) {
    showError(error)
  }
}

function downloadAttachment() {
  saveFile(
    invoice.value.pdfEsternoBlob,
    t('invoiceDetail.attachmentName', { number: invoice.value.numero, year: invoice.value.anno }),
  )
}

/**
 * Attach or replace the PDF of an external invoice.
 *
 * @param {Event} event
 */
async function attachPdf(event) {
  const [file] = event.target.files

  if (!file) {
    return
  }

  message.value = ''

  try {
    await invoiceStore.attachExternalPdf(invoice.value.id, file)
    await reload()
  } catch (error) {
    showError(error)
  }
}

/**
 * Delete the draft, then go back to the list. When the server fails, close
 * the dialog and stay on the draft with the message.
 */
async function deleteDraft() {
  confirmDelete.value = false
  message.value = ''

  try {
    await invoiceStore.remove(invoice.value.id)
    router.push({ name: 'fatture' })
  } catch (error) {
    showError(error)
  }
}

</script>

<template>
  <article v-if="invoice" data-part="invoice-detail">
    <header data-part="page-header">
      <h1>{{ t('invoiceDetail.title', { number: invoiceNumber(invoice) || t('invoiceStatus.bozza') }) }}</h1>
      <p data-part="badges">
        <span data-part="badge" :data-kind="isExternal ? 'esterna' : 'interna'">
          {{ isExternal ? t('invoiceOrigin.esterna') : t('invoiceDetail.createdHere') }}
        </span>
        <span data-part="badge" :data-kind="invoice.stato">{{ t(`invoiceStatus.${invoice.stato}`) }}</span>
      </p>
    </header>

    <p v-if="message" role="alert" data-part="notice">
      {{ message }}
    </p>
    <section v-if="xmlErrors.length > 0" role="alert" data-part="xml-errors">
      <strong>{{ t('invoiceDetail.xmlError') }}</strong>
      <ul>
        <li v-for="error in xmlErrors" :key="error">
          {{ error }}
        </li>
      </ul>
    </section>

    <section v-if="!isExternal" data-part="card" :aria-label="t('invoiceDetail.actionsLabel')">
      <menu data-part="buttons">
        <li>
          <button type="button" data-variant="primary" @click="downloadPdf">
            {{ t('invoiceDetail.downloadPdf') }}
          </button>
        </li>
        <li>
          <button type="button" @click="downloadXml">
            {{ t('invoiceDetail.downloadXml') }}
          </button>
        </li>
        <li>
          <button type="button" disabled aria-describedby="invoice-sdi-note">
            {{ t('invoiceDetail.sendSdi') }}
          </button>
        </li>
        <li v-if="isDraft">
          <button type="button" data-variant="danger" @click="confirmDelete = true">
            {{ t('invoiceDetail.deleteDraft') }}
          </button>
        </li>
      </menu>
      <p id="invoice-sdi-note" data-part="note">
        {{ t('invoiceDetail.sdiNote') }}
      </p>
    </section>

    <section v-else data-part="card" :aria-label="t('invoiceDetail.actionsLabel')">
      <menu data-part="buttons">
        <li v-if="invoice.pdfEsternoBlob">
          <button type="button" data-variant="primary" @click="downloadAttachment">
            {{ t('invoiceDetail.downloadAttachment') }}
          </button>
        </li>
        <li>
          <label for="invoice-attachment">
            {{ invoice.pdfEsternoBlob ? t('invoiceDetail.replacePdf') : t('invoiceDetail.attachPdf') }}
          </label>
          <input id="invoice-attachment" type="file" accept="application/pdf" @change="attachPdf">
        </li>
      </menu>
      <p data-part="note">
        {{ t('invoiceDetail.externalNote') }}
      </p>
    </section>

    <section v-if="statuses.length > 0" data-part="card" aria-labelledby="invoice-status-title">
      <h2 id="invoice-status-title">
        {{ t('invoiceDetail.statusTitle') }}
      </h2>
      <menu data-part="buttons">
        <li v-for="status in statuses" :key="status">
          <button type="button" data-size="small" @click="changeStatus(status)">
            {{ t('invoiceDetail.moveTo', { status: t(`invoiceStatus.${status}`) }) }}
          </button>
        </li>
      </menu>
    </section>

    <section data-part="parties">
      <section data-part="card" aria-labelledby="invoice-client-title">
        <h2 id="invoice-client-title">
          {{ t('invoiceDetail.clientTitle') }}
        </h2>
        <p>
          <strong>{{ clientName(client) }}</strong><br>
          {{ client.indirizzo }}<br>
          {{ client.cap }} {{ client.citta }} ({{ client.provincia }})
        </p>
        <p data-part="note">
          <template v-if="client.codiceFiscale">
            {{ t('invoiceDetail.taxCode', { value: client.codiceFiscale }) }}<br>
          </template>
          <template v-if="client.partitaIVA">
            {{ t('invoiceDetail.vatNumber', { value: client.partitaIVA }) }}
          </template>
        </p>
      </section>
      <section data-part="card" aria-labelledby="invoice-document-title">
        <h2 id="invoice-document-title">
          {{ t('invoiceDetail.documentTitle') }}
        </h2>
        <dl data-part="facts">
          <dt>{{ t('invoiceDetail.date') }}</dt>
          <dd>
            <time :datetime="invoice.data">{{ formatDate(invoice.data) }}</time>
          </dd>
          <dt>{{ t('invoiceDetail.payment') }}</dt>
          <dd>{{ invoice.modalitaPagamento || t('common.empty') }}</dd>
          <dt>{{ t('invoiceDetail.dueDate') }}</dt>
          <dd>{{ invoice.scadenzaPagamento ? formatDate(invoice.scadenzaPagamento) : t('common.empty') }}</dd>
        </dl>
      </section>
    </section>

    <section data-part="lines" :aria-label="t('invoiceDetail.linesLabel')">
      <table>
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
          <tr v-for="(line, index) in invoice.righe" :key="index">
            <td>{{ line.descrizione }}</td>
            <td data-align="end">
              {{ line.quantita }}
            </td>
            <td data-align="end">
              {{ formatEuro(line.prezzoUnitario) }}
            </td>
            <td data-align="end">
              {{ formatEuro(line.totaleRiga) }}
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section data-part="card" :aria-label="t('invoiceTotals.label')">
      <InvoiceTotals :amounts="invoice" document />
    </section>

    <section data-part="card" aria-labelledby="invoice-legal-title">
      <h2 id="invoice-legal-title">
        {{ t('invoiceDetail.legalTitle') }}
      </h2>
      <p data-part="note">
        {{ settings.dicituraRegime }}
      </p>
      <p v-if="invoice.marcaDaBollo" data-part="note">
        {{ settings.testoBollo }}
      </p>
      <p v-if="invoice.note">
        <strong>{{ t('invoiceDetail.notes') }}</strong> {{ invoice.note }}
      </p>
    </section>

    <ConfirmDialog
      v-if="confirmDelete"
      :title="t('invoiceDetail.deleteTitle')"
      :message="t('invoiceDetail.deleteMessage')"
      :confirm-label="t('common.delete')"
      danger
      @confirm="deleteDraft"
      @cancel="confirmDelete = false"
    />
  </article>
  <p v-else data-part="loading">
    {{ t('invoiceDetail.loading') }}
  </p>
</template>
