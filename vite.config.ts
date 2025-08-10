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
      output: {
        // Temporarily disable manual chunks to force new hash
        // manualChunks: {
        //   // Core React libraries
        //   'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        //   
        //   // Firebase chunk
        //   'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
        //   
        //   // UI & Icons libraries
        //   'ui-vendor': ['react-icons', 'react-toastify', 'recharts'],
        //   
        //   // Redux & State Management
        //   'state-vendor': ['react-redux', '@reduxjs/toolkit'],
        //   
        //   // File processing utilities
        //   'file-vendor': ['papaparse', 'mammoth', 'xlsx', 'pdfjs-dist', 'tesseract.js'],
        //   
        //   // DnD & Other utilities
        //   'utils-vendor': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities', 'dayjs']
        // }
      }
    },
    // Increase chunk size limit warning threshold
    chunkSizeWarningLimit: 1000,
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true
      }
    }
  },
  server: {
    fs: {
      allow: ['..']
    }
  }
})
