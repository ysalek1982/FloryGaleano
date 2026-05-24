import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('react') || id.includes('scheduler')) return 'react-vendor'
          if (id.includes('@supabase')) return 'supabase-vendor'
          if (id.includes('write-excel-file') || id.includes('fflate')) return 'exports-vendor'
          if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) return 'forms-vendor'
          if (id.includes('i18next') || id.includes('react-i18next')) return 'i18n-vendor'
          if (id.includes('lucide-react')) return 'icons-vendor'
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
