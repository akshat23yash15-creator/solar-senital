import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const API_BASE = process.env.VITE_API_BASE_URL || 'https://solar-sentinel-v2.onrender.com'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        presets: ['@babel/preset-react'],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: API_BASE,
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
