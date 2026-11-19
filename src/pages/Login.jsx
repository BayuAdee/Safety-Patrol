import { useState } from 'react'
import { supabase } from '../supabase'

export default function Login() {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    const f = new FormData(e.target)
    const { error } = await supabase.auth.signInWithPassword({
      email: f.get('email'),
      password: f.get('password'),
    })
    setBusy(false)
    if (error) setError(error.message === 'Invalid login credentials' ? 'Email atau password salah.' : error.message)
  }

  const input = 'w-full bg-gray-50 border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-gray-900 outline-none'
  return (
    <div className="flex min-h-screen justify-center bg-gray-200">
      <form onSubmit={submit} className="flex w-full max-w-md flex-col justify-center gap-4 bg-white p-6">
        <div className="mb-4 flex items-center gap-3">
          <img src="/logo.jpg" alt="Logo YFI" className="h-14 w-14 rounded-full" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">YFI Patrol</h1>
            <p className="text-sm text-gray-500">PT Yahata Fastener Indonesia</p>
          </div>
        </div>
        <input name="email" type="email" placeholder="Email" autoComplete="username" required className={input} />
        <input name="password" type="password" placeholder="Password" autoComplete="current-password" required className={input} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={busy} className="w-full rounded-xl bg-gray-900 py-4 font-bold text-white shadow-lg disabled:opacity-50">
          {busy ? 'Memproses...' : 'MASUK'}
        </button>
      </form>
    </div>
  )
}
