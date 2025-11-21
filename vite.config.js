import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Read repo name from environment so CI or local .env can set it.
// If not provided, fall back to root '/'. For GitHub Pages set VITE_REPO_NAME=your-repo-name
const repoName = process.env.VITE_REPO_NAME || process.env.REPO_NAME || ''
const base = repoName ? `/${repoName}/` : '/'

// https://vitejs.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
})
