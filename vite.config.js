import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// The app calls /api/... as same-origin; Vite forwards those requests to the
// local Node server, the only process that knows the database credentials, so
// no secret ends up in the bundle. The proxy follows PORTA_API, like the server.
const apiPort = process.env.PORTA_API || 3001

export default defineConfig({
  plugins: [
    vue({
      // <search> is a native HTML element (2023) the Vue compiler does not know yet.
      template: { compilerOptions: { isCustomElement: (tag) => tag === 'search' } },
    }),
  ],
  // Vitest runs the unit tests only: the *.spec.js files are Playwright tests.
  test: {
    include: ['tests/**/*.test.js'],
  },
  server: {
    port: Number(process.env.PORTA_WEB || 5173),
    open: !process.env.CI && !process.env.PORTA_WEB,
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${apiPort}`,
        changeOrigin: true,
      },
    },
  },
})
