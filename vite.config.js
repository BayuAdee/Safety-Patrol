import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // /api diteruskan ke Laravel (php artisan serve). HP cukup membuka alamat Vite, tanpa urusan CORS.
  server: { proxy: { '/api': 'http://127.0.0.1:8000' } },
})
