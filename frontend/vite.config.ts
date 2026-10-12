import react from '@vitejs/plugin-react'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import icons from 'unplugin-icons/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), tailwindcss(), icons({ compiler: 'jsx', jsx: 'react', scale: 1 })],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET ?? 'https://localhost:7075',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
