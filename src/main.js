/**
 * @module main
 * App entry point: global styles, Pinia, router, mount.
 * base.css holds the design tokens and element defaults; each component and
 * view imports its own CSS file.
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import { i18n } from './i18n'
import './styles/base.css'

const app = createApp(App)

app.use(i18n)
app.use(createPinia())
app.use(router)
app.mount('#app')
