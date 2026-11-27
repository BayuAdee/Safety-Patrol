import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // /api diteruskan ke Laravel (php artisan serve). HP cukup membuka alamat Vite, tanpa urusan CORS.
  // vendor/ dan storage/ milik Laravel (satu folder), tidak perlu diawasi Vite.
  server: { proxy: { '/api': 'http://127.0.0.1:8000' }, watch: { ignored: ['**/vendor/**', '**/storage/**'] } },
})
