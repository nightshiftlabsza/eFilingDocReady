import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Use our own public/manifest.json instead of auto-generated
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,woff2}'],
        // Don't cache pdfjs worker — it's large and loaded on demand
        globIgnores: ['**/pdf.worker*'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
