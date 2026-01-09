import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    VitePWA({
      // 🔥 Auto-update strategy: Update immediately when new version available
      registerType: 'autoUpdate',
      
      // 🔥 Generate SW automatically (no manual sw.js needed)
      strategies: 'generateSW',
      
      // 🔥 Workbox configuration for offline support
      workbox: {
        // Cache ALL build output files (including lazy-loaded chunks)
        // 🔥 CRITICAL: Include locales folder for offline i18n support
        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,woff2,woff,ttf}',
          'locales/**/*.json'  // i18n translation files
        ],
        
        // Increase file size limit (for large JS bundles)
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
        
        // Skip caching API/Firebase requests (let SDK handle)
        navigateFallbackDenylist: [
          /^\/api/,
          /^https:\/\/firebasestorage/,
          /^https:\/\/.*\.googleapis\.com/,
          /^https:\/\/.*\.firebaseio\.com/
        ],
        
        // Cleanup old caches automatically
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        
        // Runtime caching for external resources
        runtimeCaching: [
          // 🔥 NEW: Cache i18n locale files (offline support)
          {
            urlPattern: /\/locales\/.*\.json$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'i18n-locales-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          {
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'firebase-storage-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 1 week
              }
            }
          }
        ]
      },
      
      // PWA manifest
      manifest: {
        name: 'Quiz Trivia App',
        short_name: 'QuizApp',
        description: 'Ứng dụng Quiz Offline - Learn Anytime, Anywhere',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        orientation: 'portrait-primary',
        categories: ['education', 'games'],
        icons: [
          {
            src: '/logo-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: '/logo-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'maskable'
          },
          {
            src: '/logo.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: '/logo.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable'
          }
        ],
        screenshots: [
          {
            src: '/images/default-quiz-cover.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Quiz App Homepage'
          }
        ]
      },
      
      // Development mode settings
      devOptions: {
        enabled: false, // Disable in dev for faster HMR
        type: 'module'
      }
    })
  ],
  server: {
    fs: {
      allow: ['..']
    }
  },
  // Ensure proper build output
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Generate sourcemaps for debugging
    sourcemap: false,
    // 🔥 Remove console.* and debugger in production
    minify: 'esbuild',
    // Optimize chunks
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          'ui-vendor': ['lucide-react', 'react-toastify']
        }
      }
    }
  },
  // 🔥 Drop console.* and debugger in production build
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : []
  }
}));