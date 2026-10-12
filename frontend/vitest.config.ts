import react from '@vitejs/plugin-react'
import icons from 'unplugin-icons/vite'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), icons({ compiler: 'jsx', jsx: 'react', scale: 1 })],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
})
