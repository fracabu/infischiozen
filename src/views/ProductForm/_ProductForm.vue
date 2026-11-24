<script setup>
/**
 * Product form: create or edit a catalog product. vee-validate runs the zod
 * schema of src/lib/productSchema.js.
 */
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { useProdottiStore } from '../../stores/prodotti'
import { productSchema, emptyProduct, productUnits } from '../../lib/productSchema'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const store = useProdottiStore()

const { defineField, handleSubmit, errors, isSubmitting, submitCount, resetForm } = useForm({
  validationSchema: toTypedSchema(productSchema),
  initialValues: emptyProduct(),
})

const options = { validateOnModelUpdate: false }
const [name, nameAttrs] = defineField('nome', options)
const [description, descriptionAttrs] = defineField('descrizione', options)
const [category, categoryAttrs] = defineField('categoria', options)
const [unit, unitAttrs] = defineField('unitaMisura', options)
const [price, priceAttrs] = defineField('prezzo', options)
const [active, activeAttrs] = defineField('attivo', options)

const productId = computed(() => route.params.id)
const isEdit = computed(() => Boolean(productId.value))
const hasErrors = computed(() => submitCount.value > 0 && Object.keys(errors.value).length > 0)

onMounted(async () => {
  if (!isEdit.value) {
    return
  }

  const product = await store.get(productId.value)

  if (!product) {
    router.replace({ name: 'prodotti' })

    return
  }

  resetForm({ values: { ...emptyProduct(), ...product } })
})

/** Move focus to the first field with an error. */
function focusFirstError({ errors: fieldErrors }) {
  const first = ['nome', 'prezzo'].find((field) => fieldErrors[field])

  if (first) {
    document.getElementById(`product-${first}`)?.focus()
  }
}

function cancel() {
  router.push({ name: 'prodotti' })
}

const onSubmit = handleSubmit(async (product) => {
  await store.salva(product)
  router.push({ name: 'prodotti' })
}, focusFirstError)
</script>

<template>
  <article data-part="product-form">
    <header data-part="page-header">
      <h1>{{ isEdit ? t('productForm.titleEdit') : t('productForm.titleNew') }}</h1>
      <menu data-part="actions">
        <li>
          <button type="button" @click="cancel">
            {{ t('common.cancel') }}
          </button>
        </li>
        <li>
          <button type="submit" form="product-form" data-variant="primary" :disabled="isSubmitting">
            {{ isSubmitting ? t('productForm.saving') : t('productForm.save') }}
          </button>
        </li>
      </menu>
    </header>

    <p v-if="hasErrors" role="alert" data-part="alert">
      {{ t('productForm.invalid') }}
    </p>

    <form id="product-form" data-part="card" novalidate @submit="onSubmit">
      <p data-part="field" data-width="wide">
        <label for="product-nome">
          {{ t('productForm.field.name') }}
          <abbr :title="t('productForm.required')">*</abbr>
        </label>
        <input
          id="product-nome"
          v-model="name"
          v-bind="nameAttrs"
          type="text"
          aria-required="true"
          :aria-invalid="errors.nome ? 'true' : undefined"
          :aria-describedby="errors.nome ? 'product-nome-error' : undefined"
        >
        <small v-if="errors.nome" id="product-nome-error" data-part="error">
          {{ t(errors.nome) }}
        </small>
      </p>

      <p data-part="field" data-width="wide">
        <label for="product-descrizione">{{ t('productForm.field.description') }}</label>
        <textarea id="product-descrizione" v-model="description" v-bind="descriptionAttrs" />
      </p>

      <p data-part="field">
        <label for="product-categoria">{{ t('productForm.field.category') }}</label>
        <input id="product-categoria" v-model="category" v-bind="categoryAttrs" type="text">
      </p>

      <p data-part="field">
        <label for="product-unitaMisura">{{ t('productForm.field.unit') }}</label>
        <select id="product-unitaMisura" v-model="unit" v-bind="unitAttrs">
          <option v-for="option in productUnits" :key="option" :value="option">
            {{ t(`unit.${option}`) }}
          </option>
        </select>
      </p>

      <p data-part="field">
        <label for="product-prezzo">{{ t('productForm.field.price') }}</label>
        <input
          id="product-prezzo"
          v-model="price"
          v-bind="priceAttrs"
          type="number"
          min="0"
          step="0.01"
          :aria-invalid="errors.prezzo ? 'true' : undefined"
          :aria-describedby="errors.prezzo ? 'product-prezzo-error' : undefined"
        >
        <small v-if="errors.prezzo" id="product-prezzo-error" data-part="error">
          {{ t(errors.prezzo) }}
        </small>
      </p>

      <fieldset data-part="field" data-width="wide">
        <legend>{{ t('productForm.field.status') }}</legend>
        <label data-part="checkbox">
          <input v-model="active" v-bind="activeAttrs" type="checkbox">
          {{ t('productForm.activeLabel') }}
        </label>
      </fieldset>
    </form>

    <footer data-part="actions">
      <button type="button" @click="cancel">
        {{ t('common.cancel') }}
      </button>
      <button type="submit" form="product-form" data-variant="primary" :disabled="isSubmitting">
        {{ isSubmitting ? t('productForm.saving') : t('productForm.save') }}
      </button>
    </footer>
  </article>
</template>
