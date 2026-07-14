import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const config = {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['kekule']
    },
    base: '/',
  }

  if (command !== 'serve') {
    config.base = '/AtomClay/'
  }

  return config
})
