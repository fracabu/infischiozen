<script setup>
/**
 * Modal confirmation built on the native <dialog> element: focus trapping,
 * Escape to close and the backdrop come from the browser.
 * Emits `confirm` or `cancel`; the parent decides whether to unmount it.
 */
import { onMounted, ref } from 'vue'
import './_ConfirmDialog.css'

defineProps({
  title: { type: String, default: 'Conferma' },
  message: { type: String, default: '' },
  confirmLabel: { type: String, default: 'Conferma' },
  cancelLabel: { type: String, default: 'Annulla' },
  danger: { type: Boolean, default: false },
})

const emit = defineEmits(['confirm', 'cancel'])
const dialog = ref(null)

onMounted(() => {
  dialog.value?.showModal()
})

/**
 * A click whose target is the <dialog> itself landed on the backdrop.
 *
 * @param {MouseEvent} event
 */
function onBackdropClick(event) {
  if (event.target === dialog.value) {
    emit('cancel')
  }
}
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      data-part="confirm-dialog"
      aria-labelledby="confirm-dialog-title"
      @cancel.prevent="emit('cancel')"
      @click="onBackdropClick"
    >
      <h2 id="confirm-dialog-title">
        {{ title }}
      </h2>
      <p data-part="message">
        {{ message }}
      </p>
      <footer data-part="actions">
        <button type="button" @click="emit('cancel')">
          {{ cancelLabel }}
        </button>
        <button
          type="button"
          :data-variant="danger ? 'danger' : 'primary'"
          @click="emit('confirm')"
        >
          {{ confirmLabel }}
        </button>
      </footer>
    </dialog>
  </Teleport>
</template>
