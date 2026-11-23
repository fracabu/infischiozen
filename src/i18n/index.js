/**
 * @module i18n
 * vue-i18n setup. Components hold translation keys only; the display text
 * lives in src/locales/<locale>.json (rule-styleguide-i18n).
 */
import { createI18n } from 'vue-i18n'
import it from '../locales/it.json'

/**
 * The app-wide i18n instance, Composition API mode.
 *
 * @type {import('vue-i18n').I18n}
 */
export const i18n = createI18n({
  legacy: false,
  locale: 'it',
  fallbackLocale: 'it',
  messages: { it },
})
