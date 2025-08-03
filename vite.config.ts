import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // PDF.js configuration for Advanced File Upload
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['pdfjs-dist']
  },
  worker: {
    format: 'es'
  },
  // Additional config for file processing
  build: {
    rollupOptions: {
      external: [],
    },
  },
  server: {
    fs: {
      allow: ['..']
    }
  }
})
