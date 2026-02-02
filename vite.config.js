import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Proxy API requests to the backend middle-layer

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const middlewarePort = process.env.MIDDLEWARE_PORT || '3000'
  const middlewareTarget = `http://localhost:${middlewarePort}`
  const config = {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['kekule']
    },
    base: '/',
    server: {
      proxy: {
        '/run': {
          target: middlewareTarget,
          changeOrigin: true,
          secure: false,
        },
        '/apps': {
          target: middlewareTarget,
          changeOrigin: true,
          secure: false,
        },
        '/logs': {
          target: middlewareTarget,
          changeOrigin: true,
          secure: false,
        },
        '/materials': {
          target: middlewareTarget,
          changeOrigin: true,
          secure: false,
        },
        '/get_final_structure': {
          target: middlewareTarget,
          changeOrigin: true,
          secure: false,
        },
        '/import': {
          target: middlewareTarget,
          changeOrigin: true,
          secure: false,
        },
        '/export': {
          target: middlewareTarget,
          changeOrigin: true,
          secure: false,
        },
        '/list': {
          target: middlewareTarget,
          changeOrigin: true,
          secure: false,
        },
        '/get_config': {
          target: middlewareTarget,
          changeOrigin: true,
          secure: false,
        },
        '/config': {
          target: middlewareTarget,
          changeOrigin: true,
          secure: false,
        },
        '/env': {
          target: middlewareTarget,
          changeOrigin: true,
          secure: false,
        },
        '/set_config': {
          target: middlewareTarget,
          changeOrigin: true,
          secure: false,
        },
        '/set_env': {
          target: middlewareTarget,
          changeOrigin: true,
          secure: false,
        },
        '/validate': {
          target: middlewareTarget,
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
