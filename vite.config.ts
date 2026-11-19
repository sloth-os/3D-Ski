import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/three/')) return 'mountain-renderer'
        },
      },
    },
    chunkSizeWarningLimit: 650,
  },
})
