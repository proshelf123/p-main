import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  
  server: {
    host: true, // Ou '0.0.0.0'
  },

  build: {
    rollupOptions: {
      output: {
        // Separa dependências grandes em chunks próprios: mudam pouco entre
        // deploys, então o navegador reaproveita o cache e só rebaixa o app.
        // Obs.: o Vite 8 usa rolldown, que exige manualChunks como FUNÇÃO.
        manualChunks(id) {
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
            return 'firebase'
          }
          if (id.includes('node_modules/framer-motion') || id.includes('node_modules/motion-dom') || id.includes('node_modules/motion-utils')) {
            return 'motion'
          }
        },
      },
    },
  },

})