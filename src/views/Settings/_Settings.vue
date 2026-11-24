<script setup>
/**
 * Settings: the seller's data, tax options, invoice numbering and PDF logo.
 * vee-validate runs the zod schema of src/lib/settingsSchema.js.
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { useImpostazioniStore } from '../../stores/impostazioni'
import { DEFAULT_SETTINGS } from '../../data/defaultSettings'
import { settingsSchema, LEGAL_TEXT_MAX } from '../../lib/settingsSchema'
import './_Settings.css'

const route = useRoute()
const { t } = useI18n()
const store = useImpostazioniStore()
const loaded = ref(false)
const saved = ref(false)
const serverError = ref('')
const welcome = ref(route.query.benvenuto === '1')

/** Only the flat-rate regime: calculations and XML (Natura N2.2) assume it. */
const taxRegimes = ['RF19']

const { defineField, handleSubmit, errors, isSubmitting, submitCount, resetForm, values, setFieldValue } = useForm({
  validationSchema: toTypedSchema(settingsSchema),
  initialValues: { ...DEFAULT_SETTINGS },
})

/**
 * Field sets of the form. Each field: name in the record, label key, and
 * optional flags. `kind` is input (default), textarea, select or checkbox.
 * `enabledBy` names the checkbox that switches the field on.
 */
const sections = [
  {
    key: 'identity',
    fields: [
      { name: 'nome', label: 'firstName', required: true },
      { name: 'cognome', label: 'lastName', required: true },
      { name: 'ragioneSociale', label: 'companyName', wide: true },
      { name: 'partitaIVA', label: 'vatNumber', required: true },
      { name: 'codiceFiscale', label: 'taxCode', required: true },
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
    key: 'contacts',
    fields: [
      { name: 'email', label: 'email', type: 'email' },
      { name: 'pec', label: 'pec', type: 'email' },
      { name: 'telefono', label: 'phone', type: 'tel' },
      { name: 'iban', label: 'iban' },
      { name: 'intestatarioIban', label: 'ibanHolder' },
      { name: 'banca', label: 'bank' },
    ],
  },
  {
    key: 'tax',
    fields: [
      { name: 'regimeFiscale', label: 'taxRegime', kind: 'select' },
      { name: 'regimePrevidenziale', label: 'pensionScheme' },
      { name: 'dicituraRegime', label: 'legalText', kind: 'textarea', wide: true, counter: LEGAL_TEXT_MAX },
      { name: 'applicaRivalsaInps', label: 'rivalsa', kind: 'checkbox' },
      { name: 'percentualeRivalsaInps', label: 'rivalsaPercent', type: 'number', step: '0.1', enabledBy: 'applicaRivalsaInps' },
      { name: 'prezziLordi', label: 'grossPrices', kind: 'checkbox', wide: true, enabledBy: 'applicaRivalsaInps' },
      { name: 'applicaMarcaDaBollo', label: 'stampDuty', kind: 'checkbox' },
      { name: 'addebitaBolloAlCliente', label: 'stampDutyToClient', kind: 'checkbox', enabledBy: 'applicaMarcaDaBollo' },
      { name: 'sogliaBollo', label: 'stampDutyThreshold', type: 'number', step: '0.01', enabledBy: 'applicaMarcaDaBollo' },
      { name: 'importoBollo', label: 'stampDutyAmount', type: 'number', step: '0.01', enabledBy: 'applicaMarcaDaBollo' },
      { name: 'testoBollo', label: 'stampDutyText', kind: 'textarea', wide: true, enabledBy: 'applicaMarcaDaBollo' },
    ],
  },
]

const fieldNames = sections.flatMap((section) => section.fields.map((field) => field.name))
const fields = Object.fromEntries(fieldNames.map((name) => [name, defineField(name, { validateOnModelUpdate: false })]))
const hasErrors = computed(() => submitCount.value > 0 && Object.keys(errors.value).length > 0)
const currentYear = new Date().getFullYear()

onMounted(async () => {
  await store.carica()
  resetForm({ values: { ...DEFAULT_SETTINGS, ...store.dati } })
  loaded.value = true
})

/**
 * Element id of a field input.
 *
 * @param {string} name
 * @returns {string}
 */
function inputId(name) {
  return `settings-${name}`
}

/**
 * @param {{ enabledBy?: string }} field
 * @returns {boolean} true when the checkbox that controls the field is off
 */
function isDisabled(field) {
  return Boolean(field.enabledBy) && !values[field.enabledBy]
}

/**
 * Ids that describe a field: its error, else its hint or counter.
 *
 * @param {{ name: string, hint?: string, counter?: number }} field
 * @returns {string|undefined}
 */
function describedBy(field) {
  if (errors.value[field.name]) {
    return `${inputId(field.name)}-error`
  }

  return field.hint || field.counter ? `${inputId(field.name)}-hint` : undefined
}

/** Move focus to the first field with an error. */
function focusFirstError({ errors: fieldErrors }) {
  const first = fieldNames.find((name) => fieldErrors[name])

  if (first) {
    document.getElementById(inputId(first))?.focus()
  }
}

/**
 * Read the picked image as a data URL and keep it as the PDF logo.
 *
 * @param {Event} event
 */
function pickLogo(event) {
  const [file] = event.target.files

  if (!file) {
    return
  }

  const reader = new FileReader()

  reader.addEventListener('load', () => setFieldValue('logoBase64', reader.result))
  reader.readAsDataURL(file)
}

function removeLogo() {
  setFieldValue('logoBase64', '')
}

const onSubmit = handleSubmit(async (settings) => {
  saved.value = false
  serverError.value = ''

  try {
    await store.salva(settings)
    resetForm({ values: { ...DEFAULT_SETTINGS, ...store.dati } })
    saved.value = true
    welcome.value = false
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (error) {
    serverError.value = error instanceof Error ? error.message : String(error)
  }
}, focusFirstError)
</script>

<template>
  <article v-if="loaded" data-part="settings">
    <header data-part="page-header">
      <h1>{{ t('settingsForm.title') }}</h1>
      <menu data-part="actions">
        <li>
          <button type="submit" form="settings-form" data-variant="primary" :disabled="isSubmitting">
            {{ isSubmitting ? t('settingsForm.saving') : t('settingsForm.save') }}
          </button>
        </li>
      </menu>
    </header>

    <i18n-t v-if="welcome" keypath="settingsForm.welcome" tag="p" data-part="info">
      <template #button>
        <strong>{{ t('settingsForm.save') }}</strong>
      </template>
    </i18n-t>
    <p role="status" data-part="success">
      {{ saved ? t('settingsForm.saved') : '' }}
    </p>
    <p v-if="serverError || hasErrors" role="alert" data-part="alert">
      {{ serverError || t('settingsForm.invalid') }}
    </p>

    <form id="settings-form" novalidate @submit="onSubmit">
      <fieldset v-for="section in sections" :key="section.key" data-part="card">
        <legend>{{ t(`settingsForm.section.${section.key}`) }}</legend>
        <template v-for="field in section.fields" :key="field.name">
          <fieldset v-if="field.kind === 'checkbox'" data-part="field" :data-width="field.wide ? 'wide' : undefined">
            <legend>{{ t(`settingsForm.field.${field.label}`) }}</legend>
            <label data-part="checkbox">
              <input
                :id="inputId(field.name)"
                v-model="fields[field.name][0].value"
                v-bind="fields[field.name][1].value"
                type="checkbox"
                :disabled="isDisabled(field)"
              >
              {{ t(`settingsForm.checkbox.${field.label}`) }}
            </label>
          </fieldset>
          <p v-else data-part="field" :data-width="field.wide ? 'wide' : undefined">
            <label :for="inputId(field.name)">
              {{ t(`settingsForm.field.${field.label}`) }}
              <abbr v-if="field.required" :title="t('settingsForm.required')">*</abbr>
            </label>
            <textarea
              v-if="field.kind === 'textarea'"
              :id="inputId(field.name)"
              v-model="fields[field.name][0].value"
              v-bind="fields[field.name][1].value"
              :disabled="isDisabled(field)"
              :aria-invalid="errors[field.name] ? 'true' : undefined"
              :aria-describedby="describedBy(field)"
            />
            <select
              v-else-if="field.kind === 'select'"
              :id="inputId(field.name)"
              v-model="fields[field.name][0].value"
              v-bind="fields[field.name][1].value"
            >
              <option v-for="regime in taxRegimes" :key="regime" :value="regime">
                {{ t(`settingsForm.taxRegime.${regime}`) }}
              </option>
            </select>
            <input
              v-else
              :id="inputId(field.name)"
              v-model="fields[field.name][0].value"
              v-bind="fields[field.name][1].value"
              :type="field.type || 'text'"
              :step="field.step"
              :disabled="isDisabled(field)"
              :aria-required="field.required ? 'true' : undefined"
              :aria-invalid="errors[field.name] ? 'true' : undefined"
              :aria-describedby="describedBy(field)"
            >
            <small v-if="errors[field.name]" :id="`${inputId(field.name)}-error`" data-part="error">
              {{ t(errors[field.name], { max: field.counter }) }}
            </small>
            <small v-else-if="field.counter" :id="`${inputId(field.name)}-hint`" data-part="hint">
              {{ t('settingsForm.hint.counter', { count: String(values[field.name] || '').length, max: field.counter }) }}
            </small>
            <small v-else-if="field.hint" :id="`${inputId(field.name)}-hint`" data-part="hint">
              {{ t(`settingsForm.hint.${field.hint}`) }}
            </small>
          </p>
        </template>
      </fieldset>
    </form>

    <section data-part="card" aria-labelledby="settings-numbering-title">
      <h2 id="settings-numbering-title">
        {{ t('settingsForm.section.numbering') }}
      </h2>
      <dl data-part="numbering">
        <dt>{{ t('settingsForm.nextNumber') }}</dt>
        <dd>{{ store.dati?.prossimoNumeroFattura }}/{{ currentYear }}</dd>
      </dl>
      <i18n-t keypath="settingsForm.numberingNote" tag="p" data-part="note">
        <template #path>
          <em>{{ t('settingsForm.externalPath') }}</em>
        </template>
      </i18n-t>
    </section>

    <section data-part="card" aria-labelledby="settings-logo-title">
      <h2 id="settings-logo-title">
        {{ t('settingsForm.section.logo') }}
      </h2>
      <img v-if="values.logoBase64" :src="values.logoBase64" :alt="t('settingsForm.logoAlt')" data-part="logo">
      <p v-else data-part="note">
        {{ t('settingsForm.noLogo') }}
      </p>
      <p data-part="field">
        <label for="settings-logo">{{ values.logoBase64 ? t('settingsForm.replaceLogo') : t('settingsForm.uploadLogo') }}</label>
        <input id="settings-logo" type="file" accept="image/*" @change="pickLogo">
      </p>
      <p v-if="values.logoBase64">
        <button type="button" data-size="small" @click="removeLogo">
          {{ t('settingsForm.removeLogo') }}
        </button>
      </p>
    </section>

    <footer data-part="actions">
      <button type="submit" form="settings-form" data-variant="primary" :disabled="isSubmitting">
        {{ isSubmitting ? t('settingsForm.saving') : t('settingsForm.save') }}
      </button>
    </footer>
  </article>
  <p v-else data-part="loading">
    {{ t('settingsForm.loading') }}
  </p>
</template>
