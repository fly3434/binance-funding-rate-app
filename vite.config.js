import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/binance-funding-rate-app/', 
  plugins: [react()],
})
