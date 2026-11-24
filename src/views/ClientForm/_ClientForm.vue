<script setup>
/**
 * Client form: create or edit a client. vee-validate runs the zod schema of
 * src/lib/clientSchema.js. In edit mode the view also lists the client invoices.
 */
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { useClientsStore } from '../../stores/clients'
import { useInvoicesStore } from '../../stores/invoices'
import { clientSchema, emptyClient } from '../../lib/clientSchema'
import { formatEuro, formatDate } from '../../lib/format'
import { invoiceNumber } from '../../lib/displayNames'
import './_ClientForm.css'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const clientStore = useClientsStore()
const invoiceStore = useInvoicesStore()
const clientTypes = ['privato', 'azienda', 'pa']

const { defineField, handleSubmit, errors, isSubmitting, submitCount, resetForm, values } = useForm({
  validationSchema: toTypedSchema(clientSchema),
  initialValues: emptyClient(),
})

const fields = Object.fromEntries(
  Object.keys(emptyClient()).map((name) => [name, defineField(name, { validateOnModelUpdate: false })]),
)

const clientId = computed(() => route.params.id)
const isEdit = computed(() => Boolean(clientId.value))
const isPrivate = computed(() => values.tipo === 'privato')
const hasErrors = computed(() => submitCount.value > 0 && Object.keys(errors.value).length > 0)

/**
 * Field sets of the form. The identity fields depend on the client type.
 * Each field: name in the record, label key, and optional flags.
 */
const sections = computed(() => [
  {
    key: 'identity',
    fields: isPrivate.value
      ? [
          { name: 'nome', label: 'firstName', required: true },
          { name: 'cognome', label: 'lastName', required: true },
          { name: 'codiceFiscale', label: 'taxCode', required: true, wide: true },
        ]
      : [
          { name: 'ragioneSociale', label: 'companyName', required: true, wide: true },
          { name: 'partitaIVA', label: 'vatNumber', required: true },
          { name: 'codiceFiscale', label: 'taxCodeOptional' },
        ],
  },
  {
    key: 'address',
    fields: [
      { name: 'indirizzo', label: 'address', required: true, wide: true },
      { name: 'cap', label: 'postalCode', required: true },
      { name: 'citta', label: 'city', required: true },
      { name: 'provincia', label: 'province', required: true, hint: 'province' },
      { name: 'nazione', label: 'country', hint: 'country' },
    ],
  },
  {
    key: 'einvoice',
    fields: [
      { name: 'codiceDestinatario', label: 'recipientCode', hint: 'recipientCode' },
      { name: 'pec', label: 'pec', type: 'email' },
      { name: 'email', label: 'email', type: 'email' },
      { name: 'telefono', label: 'phone', type: 'tel' },
      { name: 'note', label: 'notes', multiline: true, wide: true },
    ],
  },
])

/** Invoices of this client, in store order. */
const invoices = computed(() => {
  if (!isEdit.value) {
    return []
  }

  return invoiceStore.list.filter((invoice) => String(invoice.clienteId) === String(clientId.value))
})

const invoiceTotal = computed(() => invoices.value.reduce((sum, invoice) => sum + (Number(invoice.totale) || 0), 0))

onMounted(async () => {
  if (!isEdit.value) {
    return
  }

  const client = await clientStore.get(clientId.value)

  if (!client) {
    router.replace({ name: 'clienti' })

    return
  }

  resetForm({ values: { ...emptyClient(), ...client } })
  await invoiceStore.load()
})

/**
 * Element id of a field input.
 *
 * @param {string} name
 * @returns {string}
 */
function inputId(name) {
  return `client-${name}`
}

/**
 * Ids that describe a field: its error, else its hint.
 *
 * @param {{ name: string, hint?: string }} field
 * @returns {string|undefined}
 */
function describedBy(field) {
  if (errors.value[field.name]) {
    return `${inputId(field.name)}-error`
  }

  return field.hint ? `${inputId(field.name)}-hint` : undefined
}

/**
 * Invoice label: number/year, or draft when it has no number.
 *
 * @param {object} invoice
 * @returns {string}
 */
function invoiceLabel(invoice) {
  return invoiceNumber(invoice) || t('clientForm.purchases.draft')
}

/** Move focus to the first field with an error. */
function focusFirstError({ errors: fieldErrors }) {
  const first = Object.keys(emptyClient()).find((name) => fieldErrors[name])

  if (first) {
    document.getElementById(inputId(first))?.focus()
  }
}

function cancel() {
  router.push({ name: 'clienti' })
}

const onSubmit = handleSubmit(async (client) => {
  await clientStore.save(client)
  router.push({ name: 'clienti' })
}, focusFirstError)
</script>

<template>
  <article data-part="client-form">
    <header data-part="page-header">
      <h1>{{ isEdit ? t('clientForm.titleEdit') : t('clientForm.titleNew') }}</h1>
      <menu data-part="actions">
        <li>
          <button type="button" @click="cancel">
            {{ t('common.cancel') }}
          </button>
        </li>
        <li>
          <button type="submit" form="client-form" data-variant="primary" :disabled="isSubmitting">
            {{ isSubmitting ? t('clientForm.saving') : t('clientForm.save') }}
          </button>
        </li>
      </menu>
    </header>

    <p v-if="hasErrors" role="alert" data-part="alert">
      {{ t('clientForm.invalid') }}
    </p>

    <form id="client-form" novalidate @submit="onSubmit">
      <fieldset data-part="card">
        <legend>{{ t('clientForm.section.type') }}</legend>
        <p data-part="field">
          <label :for="inputId('tipo')">{{ t('clientForm.field.type') }}</label>
          <select :id="inputId('tipo')" v-model="fields.tipo[0].value" v-bind="fields.tipo[1].value">
            <option v-for="type in clientTypes" :key="type" :value="type">
              {{ t(`clientForm.typeOption.${type}`) }}
            </option>
          </select>
        </p>
      </fieldset>

      <fieldset v-for="section in sections" :key="section.key" data-part="card">
        <legend>{{ t(`clientForm.section.${section.key}`) }}</legend>
        <p
          v-for="field in section.fields"
          :key="field.name"
          data-part="field"
          :data-width="field.wide ? 'wide' : undefined"
        >
          <label :for="inputId(field.name)">
            {{ t(`clientForm.field.${field.label}`) }}
            <abbr v-if="field.required" :title="t('clientForm.required')">*</abbr>
          </label>
          <textarea
            v-if="field.multiline"
            :id="inputId(field.name)"
            v-model="fields[field.name][0].value"
            v-bind="fields[field.name][1].value"
          />
          <input
            v-else
            :id="inputId(field.name)"
            v-model="fields[field.name][0].value"
            v-bind="fields[field.name][1].value"
            :type="field.type || 'text'"
            :aria-required="field.required ? 'true' : undefined"
            :aria-invalid="errors[field.name] ? 'true' : undefined"
            :aria-describedby="describedBy(field)"
          >
          <small v-if="errors[field.name]" :id="`${inputId(field.name)}-error`" data-part="error">
            {{ t(errors[field.name]) }}
          </small>
          <small v-else-if="field.hint" :id="`${inputId(field.name)}-hint`" data-part="hint">
            {{ t(`clientForm.hint.${field.hint}`) }}
          </small>
        </p>
      </fieldset>
    </form>

    <section v-if="isEdit" data-part="card" aria-labelledby="client-purchases">
      <h2 id="client-purchases">
        {{ t('clientForm.section.purchases') }}
      </h2>
      <p v-if="invoices.length === 0" data-part="empty">
        {{ t('clientForm.purchases.none') }}
      </p>
      <template v-else>
        <p data-part="summary">
          {{ t('clientForm.purchases.summary', { count: invoices.length, total: formatEuro(invoiceTotal) }, invoices.length) }}
        </p>
        <ul data-part="invoices">
          <li v-for="invoice in invoices" :key="invoice.id" data-part="invoice">
            <header>
              <router-link :to="{ name: 'fattura-dettaglio', params: { id: invoice.id } }">
                {{ invoiceLabel(invoice) }}
              </router-link>
              <time :datetime="invoice.data">{{ formatDate(invoice.data) }}</time>
              <data :value="invoice.totale">{{ formatEuro(invoice.totale) }}</data>
            </header>
            <ul data-part="lines">
              <li v-for="(line, index) in invoice.righe || []" :key="index">
                <span>{{ line.descrizione }}</span>
                <span>{{ t('clientForm.purchases.line', { quantity: line.quantita, price: formatEuro(line.prezzoUnitario) }) }}</span>
              </li>
            </ul>
          </li>
        </ul>
      </template>
    </section>

    <footer data-part="actions">
      <button type="button" @click="cancel">
        {{ t('common.cancel') }}
      </button>
      <button type="submit" form="client-form" data-variant="primary" :disabled="isSubmitting">
        {{ isSubmitting ? t('clientForm.saving') : t('clientForm.save') }}
      </button>
    </footer>
  </article>
</template>
