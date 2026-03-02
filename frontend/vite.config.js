import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
        timeout: 600000, // 10 min for large video uploads
      },
      '/uploads': {
        target: 'http://backend:8000',
        changeOrigin: true
      },
      '/photos': {
        target: 'http://backend:8000',
        changeOrigin: true,
        rewrite: (path) => '/uploads' + path.replace('/photos', '')
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['framer-motion', 'react-hot-toast', 'lucide-react'],
          data: ['@tanstack/react-query', 'axios']
        }
      }
    }
  }
})