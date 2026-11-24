import { useEffect, useState } from 'react'
import { ShieldAlert, Sparkles } from 'lucide-react'
import { api, insertWithPhoto } from '../api'
import { BTN, CARD, CARD_TITLE, Checks, FIVE_R, FOUR_M, INPUT, KAIZEN, PhotoInput, SQCDM, ScoreInput, STOP6, Select, Skeleton, Tabs } from '../ui'

// Array, bukan objek: objek mengurutkan kunci angka (id) dan merusak urutan nama.
const byId = (rows) => rows.map((r) => [r.id, r.name])

// Layar CREATE (tahap Before). Isian dibaca dari form saat submit, tanpa state per field.
export default function CreateForm({ onDone }) {
  const [master, setMaster] = useState(null) // { areas, departments } sebagai [[id, nama]]
  const [type, setType] = useState('safety')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api('/master').then((m) => setMaster({ areas: byId(m.areas), departments: byId(m.departments) }), (e) => setError(e.message))
  }, [])

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await insertWithPhoto('findings', e.target, { type })
      onDone()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  if (!master) return error
    ? <p role="alert" className="m-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">Gagal memuat data master: {error}</p>
    : <Skeleton n={3} h="h-48" className="flex flex-col gap-4 p-4" />

  const safety = type === 'safety'
  return (
    <div className="pb-8">
      <div className="sticky top-16 z-10 border-b border-gray-200 bg-gray-100 lg:top-0 px-4 py-3">
        <Tabs value={type} onChange={setType} items={[['safety', 'Safety Patrol', ShieldAlert], ['5s', '5S/5R Patrol', Sparkles]]} />
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4 p-4">
        <p className="text-xs text-gray-500">Semua isian wajib, kecuali yang bertanda (opsional).</p>
        <div className={CARD}>
          <h2 className={CARD_TITLE}>1. Lokasi & Akar Masalah</h2>
          <Select label="Area / Lokasi Kejadian" name="area_id" options={master.areas} />
          <Checks label="Akar Masalah (4M) - boleh lebih dari satu" name="four_m" options={FOUR_M} />
        </div>

        {/* key: ganti tab = field jenis lain dibuang dari form */}
        {safety ? (
          <div key="safety" className={CARD}>
            <h2 className={CARD_TITLE}>2. Penilaian Safety</h2>
            <Select label="Kategori STOP 6" name="stop6" options={STOP6} />
            <ScoreInput />
            <Checks label="Saran Kaizen (opsional, boleh lebih dari satu)" name="kaizen" options={KAIZEN} required={false} />
          </div>
        ) : (
          <div key="5s" className={CARD}>
            <h2 className={CARD_TITLE}>2. Penilaian 5S/5R</h2>
            <Select label="Kategori 5R" name="five_r" options={FIVE_R} />
            <Checks label="Efek Bisnis (SQCDM) - boleh lebih dari satu" name="sqcdm" options={SQCDM} />
          </div>
        )}

        <div className={CARD}>
          <h2 className={CARD_TITLE}>3. Detail & Bukti</h2>
          <label className="block text-sm font-medium text-gray-700">
            Nama Auditor (pisahkan dengan koma)
            <input name="auditors" required pattern=".*[^,\s].*" className={INPUT} placeholder="Nama" />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Deskripsi Temuan
            <textarea name="description" required className={`${INPUT} h-24`} placeholder="Jelaskan detail bahaya/kotor..." />
          </label>
          <Select label="Departemen Tujuan (PIC)" name="target_dept_id" options={master.departments} />
          <label className="block text-sm font-medium text-gray-700">
            Tenggat Waktu (opsional)
            <input type="date" name="due_date" className={INPUT} />
          </label>
          <PhotoInput label="Foto Before (Bukti) - WAJIB" />
        </div>

        {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button disabled={busy} className={`${BTN} w-full py-3 sm:ml-auto sm:w-auto sm:px-8`}>
          {busy ? 'Mengirim...' : 'Kirim Temuan'}
        </button>
      </form>
    </div>
  )
}
