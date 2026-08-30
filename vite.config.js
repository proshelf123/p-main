import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/',
  plugins: [react()],
  
  server: {
    host: true, 
  },

  build: {
    target: 'esnext', // Gera código nativo moderno (Remove polyfills pesados e reduz tamanho em até 20%)
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Isola o React
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor';
          }
          // Isola o Firebase (que é gigantesco)
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
            return 'firebase';
          }
          // Isola o Framer Motion
          if (id.includes('node_modules/framer-motion')) {
            return 'motion';
          }
        },
      },
    },
  },
})