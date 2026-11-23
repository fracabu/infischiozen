<script setup>
/**
 * Legacy adapter: maps the Italian props and events still used by the screens
 * not yet migrated onto ConfirmDialog. Remove once no screen imports it.
 */
import { ConfirmDialog } from './ConfirmDialog'

defineProps({
  titolo: { type: String, default: 'Conferma' },
  messaggio: { type: String, default: '' },
  testoConferma: { type: String, default: 'Conferma' },
  testoAnnulla: { type: String, default: 'Annulla' },
  pericolo: { type: Boolean, default: false },
})

const emit = defineEmits(['conferma', 'annulla'])
</script>

<template>
  <ConfirmDialog
    :title="titolo"
    :message="messaggio"
    :confirm-label="testoConferma"
    :cancel-label="testoAnnulla"
    :danger="pericolo"
    @confirm="emit('conferma')"
    @cancel="emit('annulla')"
  />
</template>
