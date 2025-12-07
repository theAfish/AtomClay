import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

//  DEBUG INFO:   这里后续接入后端需要重点调整！！！！！！

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const config = {
    plugins: [react()],
    base: '/',
    server: {
      proxy: {
        '/run': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
        },
        '/apps': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
        }
      }
    }
  }

  if (command !== 'serve') {
    config.base = '/AtomClay/'
  }

  return config
})
