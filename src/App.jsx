import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import Login from './pages/Login'
import Portal from './pages/Portal'

export default function App() {
  const [session, setSession] = useState(undefined) 
  const [profile, setProfile] = useState(undefined) 

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  // Bergantung pada id, bukan objek sesi, agar refresh token tidak memuat ulang profil.
  const userId = session?.user.id
  useEffect(() => {
    setProfile(undefined)
    if (!userId) return
    supabase.from('profiles').select('name, is_admin, dept_id, departments(name)').eq('id', userId).single()
      .then(({ data }) => setProfile(data))
  }, [userId])

  if (session === undefined) return null
  if (!session) return <Login />
  if (profile === undefined) return null

  // Tanpa departemen, RLS tidak memberi tugas apa pun; admin dikecualikan.
  if (!profile || (!profile.dept_id && !profile.is_admin)) return (
    <div className="mx-auto mt-24 max-w-sm space-y-3 p-4 text-center">
      <p>{profile ? 'Akun belum diberi departemen. Hubungi admin.' : 'Profil gagal dimuat.'}</p>
      <button onClick={() => supabase.auth.signOut()} className="underline">Keluar</button>
    </div>
  )

  return <Portal profile={profile} />
}
