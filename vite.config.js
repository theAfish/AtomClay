import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Proxy API requests to the backend middle-layer

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const config = {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['kekule']
    },
    base: '/',
    server: {
      proxy: {
        '/run': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
        '/apps': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
        '/logs': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
        '/materials': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
        '/get_final_structure': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
        '/import': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
        '/export': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
        '/list': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
        '/get_config': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
        '/config': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
        '/env': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
        '/set_config': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
        '/set_env': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
        '/validate': {
          target: 'http://localhost:3000',
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
