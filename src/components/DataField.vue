<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number, Boolean], default: '' },
  label: { type: String, default: '' },
  tipo: { type: String, default: 'text' }, // text, number, email, date, textarea, select, checkbox
  obbligatorio: { type: Boolean, default: false },
  errore: { type: String, default: '' },
  hint: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  opzioni: { type: Array, default: () => [] }, // per select: [{ value, label }]
  step: { type: String, default: 'any' },
  disabled: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue'])

function aggiorna(e) {
  if (props.tipo === 'checkbox') {
    emit('update:modelValue', e.target.checked)
  } else if (props.tipo === 'number') {
    emit('update:modelValue', e.target.value === '' ? '' : Number(e.target.value))
  } else {
    emit('update:modelValue', e.target.value)
  }
}

const invalido = computed(() => !!props.errore)
</script>

<template>
  <div class="data-field">
    <label v-if="label">
      {{ label }}
      <span v-if="obbligatorio" class="obbligatorio">*</span>
    </label>

    <textarea
      v-if="tipo === 'textarea'"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :class="{ invalido }"
      @input="aggiorna"
    ></textarea>

    <select
      v-else-if="tipo === 'select'"
      :value="modelValue"
      :disabled="disabled"
      :class="{ invalido }"
      @change="aggiorna"
    >
      <option v-for="o in opzioni" :key="o.value" :value="o.value">
        {{ o.label }}
      </option>
    </select>

    <label v-else-if="tipo === 'checkbox'" class="small" style="display:flex;align-items:center;gap:8px;font-weight:500;">
      <input
        type="checkbox"
        :checked="modelValue"
        :disabled="disabled"
        style="width:auto;"
        @change="aggiorna"
      />
      <slot>{{ placeholder }}</slot>
    </label>

    <input
      v-else
      :type="tipo"
      :value="modelValue"
      :placeholder="placeholder"
      :step="tipo === 'number' ? step : undefined"
      :disabled="disabled"
      :class="{ invalido }"
      @input="aggiorna"
    />

    <div v-if="errore" class="errore">{{ errore }}</div>
    <div v-else-if="hint" class="hint">{{ hint }}</div>
  </div>
</template>
