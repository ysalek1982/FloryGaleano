import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        manualChunks(id) {
          const normalized = id.replaceAll('\\', '/')
          if (!normalized.includes('/node_modules/')) return
          const pkg = (name: string) => normalized.includes(`/node_modules/${name}/`)
          if (pkg('lucide-react')) return 'icons-vendor'
          if (pkg('@supabase/supabase-js') || pkg('@supabase/auth-js') || pkg('@supabase/functions-js') || pkg('@supabase/postgrest-js') || pkg('@supabase/realtime-js') || pkg('@supabase/storage-js')) return 'supabase-vendor'
          if (pkg('write-excel-file') || pkg('fflate')) return 'exports-vendor'
          if (pkg('react-hook-form') || pkg('@hookform/resolvers') || pkg('zod')) return 'forms-vendor'
          if (pkg('i18next') || pkg('react-i18next') || pkg('i18next-browser-languagedetector')) return 'i18n-vendor'
          if (pkg('react') || pkg('react-dom') || pkg('scheduler')) return 'react-vendor'
          return 'vendor'
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    exclude: ['e2e/**', 'node_modules/**', 'dist/**', '.git/**'],
  },
})
