import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    open: true,
    // L'app chiama /api/... come se fosse sulla stessa origine; Vite gira le
    // richieste al server Node locale, che e' l'unico a conoscere la
    // connection string di Neon. Cosi' nessun segreto entra nel bundle.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true
      }
    }
  }
})
