import { LogIn } from 'lucide-react'
import { SUPERAPPS } from '../api'
import { BTN } from '../ui'

// Belum login: sistem ini hanya dimasuki lewat Superapps (SSO), tanpa form login sendiri.
// error: pesan dari tiket Superapps yang gagal (kedaluwarsa, NIK tidak terdaftar, dst.).
export default function Login({ error }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 p-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-lg border border-gray-200 bg-white p-6 text-center">
        <img src="/logo.jpg" alt="Logo PT Yahata Fastener Indonesia" className="h-16 w-16 rounded-full" />
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Sistem Informasi Safety Patrol & 5S/5R</h1>
          <p className="text-sm text-gray-500">PT Yahata Fastener Indonesia</p>
        </div>
        {error
          ? <p role="alert" className="w-full rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          : <p className="text-sm text-gray-700">Silakan login ke Superapps dahulu, lalu pilih Safety Patrol.</p>}
        <a href={SUPERAPPS} className={`${BTN} w-full py-3`}><LogIn size={16} aria-hidden="true" /> Buka Superapps</a>
      </div>
      <p className="text-center text-xs text-gray-500">© {new Date().getFullYear()} PT Yahata Fastener Indonesia · Penggunaan internal</p>
    </div>
  )
}
