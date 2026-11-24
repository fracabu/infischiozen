<script setup>
/**
 * Modal confirmation built on the native <dialog> element: focus trapping,
 * Escape to close and the backdrop come from the browser.
 * Emits `confirm` or `cancel`; the parent decides whether to unmount it.
 * Empty labels fall back to the common translated ones.
 * The parent unmounts the dialog instead of closing it, so the browser does
 * not give focus back: the component does it, to the element that had focus
 * when the dialog opened, if that element is still on the page.
 */
import { onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import './_ConfirmDialog.css'

defineProps({
  title: { type: String, default: '' },
  message: { type: String, default: '' },
  confirmLabel: { type: String, default: '' },
  cancelLabel: { type: String, default: '' },
  danger: { type: Boolean, default: false },
})

const emit = defineEmits(['confirm', 'cancel'])
const { t } = useI18n()
const dialog = ref(null)
const opener = ref(null)

onMounted(() => {
  opener.value = document.activeElement
  dialog.value?.showModal()
})

onUnmounted(() => {
  if (opener.value?.isConnected) {
    opener.value.focus()
  }
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
        {{ title || t('common.confirm') }}
      </h2>
      <p data-part="message">
        {{ message }}
      </p>
      <footer data-part="actions">
        <button type="button" @click="emit('cancel')">
          {{ cancelLabel || t('common.cancel') }}
        </button>
        <button
          type="button"
          :data-variant="danger ? 'danger' : 'primary'"
          @click="emit('confirm')"
        >
          {{ confirmLabel || t('common.confirm') }}
        </button>
      </footer>
    </dialog>
  </Teleport>
</template>
