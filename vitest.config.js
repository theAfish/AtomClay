import { defineConfig } from 'vitest/config'

// Vitest config: ensure DOM-like environment for react/testing-library tests
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
  },
})
