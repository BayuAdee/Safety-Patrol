import { useEffect, useState } from 'react'
import { api, hasToken, loginSso, logout } from './api'
import { BTN2 } from './ui'
import Login from './pages/Login'
import Portal from './pages/Portal'

// Masuk dari Superapps: /sso#tiket=... Tiket dibaca sekali saat halaman dibuka, lalu dihapus dari alamat
// (tidak tersisa di riwayat browser). Dikirim sekali di sini, bukan di useEffect (StrictMode menjalankannya 2x).
const tiket = location.pathname === '/sso' ? decodeURIComponent(location.hash.match(/tiket=([^&]+)/)?.[1] ?? '') : null
if (tiket !== null) history.replaceState(null, '', '/')
const sso = tiket === null ? Promise.resolve()
  : tiket ? loginSso(tiket) : Promise.reject(new Error('Tiket masuk tidak ditemukan. Buka lagi dari Superapps.'))

export default function App() {
  const [profile, setProfile] = useState(undefined) // undefined = memuat, null = belum login
  const [ssoError, setSsoError] = useState('')

  const load = () => (hasToken() ? api('/me').then(setProfile, () => setProfile(null)) : setProfile(null))
  useEffect(() => { sso.then(load, (e) => { setSsoError(e.message); setProfile(null) }) }, [])

  if (profile === undefined) return <p className="mt-24 text-center text-sm text-gray-500">{tiket ? 'Masuk dari Superapps...' : 'Memuat...'}</p>
  if (!profile) return <Login error={ssoError} />

  // Tanpa departemen tidak ada tugas apa pun; admin dikecualikan.
  if (!profile.dept_id && !profile.is_admin) return (
    <div className="mx-auto mt-24 flex max-w-sm flex-col items-center gap-4 rounded-lg border border-gray-200 bg-white p-6 text-center">
      <img src="/logo.jpg" alt="Logo PT Yahata Fastener Indonesia" className="h-12 w-12 rounded-full" />
      <p className="text-sm text-gray-700">Akun Anda belum diberi departemen. Hubungi admin sistem.</p>
      <button onClick={logout} className={BTN2}>Keluar</button>
    </div>
  )

  return <Portal profile={profile} />
}
