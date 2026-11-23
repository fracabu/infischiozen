/**
 * @module main
 * App entry point: global styles, Pinia, router, mount.
 * base.css holds the design tokens and element defaults; main.css is the
 * legacy class-based stylesheet, kept until every screen is migrated.
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './styles/base.css'
import './assets/main.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.mount('#app')
