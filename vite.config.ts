import { defineConfig, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import { createApp } from './server/createApp.js'

const api = createApp()

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'mqtt-api',
      configureServer(server: ViteDevServer) {
        server.middlewares.use(api)
        console.log('MQTT API embedded in Vite dev server at /api/*')
      },
    },
  ],
})
