import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'Melodious',
        short_name: 'Music',
        description: 'Personal music player by Sankalp',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon72.png',
            sizes: '72x72',
            type: 'image/png'
          },
          {
            src: '/icons/icon512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ],
        theme_color: '#1DB954',
        background_color: '#000000',
        display: 'standalone'
      }
    })
  ],
  base: './',
})

