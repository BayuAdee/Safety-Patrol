import { useEffect, useState } from 'react'
import { ShieldAlert, Sparkles } from 'lucide-react'
import { insertWithPhoto, supabase } from '../supabase'
import { CARD, Checks, FIVE_R, FOUR_M, INPUT, KAIZEN, PhotoInput, RANK, SQCDM, STOP6, Select } from '../ui'

// Array, bukan objek: objek mengurutkan kunci angka (id) dan merusak urutan nama.
const byId = (rows) => rows.map((r) => [r.id, r.name])

// Layar CREATE (tahap Before). Isian dibaca dari form saat submit, tanpa state per field.
export default function CreateForm({ onDone }) {
  const [master, setMaster] = useState(null) // { areas, departments } sebagai [[id, nama]]
  const [type, setType] = useState('safety')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('areas').select('id, name').order('name'),
      supabase.from('departments').select('id, name').order('name'),
    ]).then(([a, d]) => {
      if (a.error || d.error) return setError((a.error ?? d.error).message)
      setMaster({ areas: byId(a.data), departments: byId(d.data) })
    })
  }, [])

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await insertWithPhoto('findings', e.target, 'photo_before', { type })
      onDone()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  if (!master) return <p className={`p-6 ${error ? 'text-red-600' : 'text-gray-500'}`}>{error ? `Gagal memuat data master: ${error}` : 'Memuat...'}</p>

  const safety = type === 'safety'
  const tab = (t, Icon, text) => (
    <button type="button" onClick={() => setType(t)}
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 font-bold ${type === t ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>
      <Icon size={18} /> {text}
    </button>
  )

  return (
    <div className="pb-20">
      <div className="sticky top-16 z-10 flex gap-2 bg-white p-4 shadow-sm">
        {tab('safety', ShieldAlert, 'Safety Patrol')}
        {tab('5s', Sparkles, '5S/5R Patrol')}
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4 p-4">
        <div className={CARD}>
          <Select label="Area / Lokasi Kejadian" name="area_id" options={master.areas} />
          <Checks label="Akar Masalah (4M) - boleh lebih dari satu" name="four_m" options={FOUR_M} />
        </div>

        {/* key: ganti tab = field jenis lain dibuang dari form */}
        {safety ? (
          <div key="safety" className={CARD}>
            <div className="flex gap-4">
              <div className="flex-1"><Select label="Kategori STOP 6" name="stop6" options={STOP6} /></div>
              <div className="w-1/3"><Select label="Rank" name="rank" options={RANK} /></div>
            </div>
            <Checks label="Saran Kaizen (opsional, boleh lebih dari satu)" name="kaizen" options={KAIZEN} required={false} />
          </div>
        ) : (
          <div key="5s" className={CARD}>
            <Select label="Kategori 5R" name="five_r" options={FIVE_R} />
            <Checks label="Efek Bisnis (SQCDM) - boleh lebih dari satu" name="sqcdm" options={SQCDM} />
          </div>
        )}

        <div className={CARD}>
          <label className="block text-xs font-bold text-gray-500">
            Deskripsi Temuan
            <textarea name="description" required className={`${INPUT} h-24`} placeholder="Jelaskan detail bahaya/kotor..." />
          </label>
          <Select label="Departemen Tujuan (PIC)" name="target_dept_id" options={master.departments} />
          <label className="block text-xs font-bold text-gray-500">
            Tenggat Waktu (opsional)
            <input type="date" name="due_date" className={INPUT} />
          </label>
          <PhotoInput label="Foto Before (Bukti) - WAJIB" />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={busy} className={`mt-2 w-full rounded-xl py-4 font-bold text-white shadow-lg disabled:opacity-50 bg-gray-900`}>
          {busy ? 'Mengirim...' : 'SUBMIT TEMUAN'}
        </button>
      </form>
    </div>
  )
}
