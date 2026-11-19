import { useState } from 'react'
import { AlertTriangle, CheckCircle, Wrench } from 'lucide-react'
import { insertWithPhoto } from '../supabase'
import { CARD, FIVE_R, FOUR_M, KAIZEN, PhotoInput, SQCDM, STOP6, SignedImg, TYPE, labels } from '../ui'

// Layar RESOLVE (tahap After): cukup foto. Insert ke resolutions = Closed; closed_at diisi database.
export default function ResolveForm({ task, onDone }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const safety = task.type === 'safety'

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await insertWithPhoto('resolutions', e.target, 'photo_after', { finding_id: task.id })
      onDone()
    } catch (err) {
      setError(err.code === '23505' ? 'Temuan ini sudah ditutup.' : err.message)
      setBusy(false)
    }
  }

  const info = (k, v) => <p>{k}: <span className="font-semibold text-gray-800">{v}</span></p>

  return (
    <div className="pb-20">
      <div className="border-b border-red-100 bg-red-50 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-bold text-red-800"><AlertTriangle size={18} /> Detail Temuan (Before)</h3>
          <span className="rounded bg-red-200 px-2 py-1 font-mono text-xs text-red-800">{task.code}</span>
        </div>
        <p className="mb-3 rounded border border-red-100 bg-white p-3 text-sm font-medium text-gray-800 shadow-sm">"{task.description}"</p>
        <div className="mb-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
          {info('📍 Area', task.areas?.name)}
          {info('⚠️ Tipe', TYPE[task.type])}
          {info('🔍 4M', labels(FOUR_M, task.four_m))}
          {info('🕒 Dibuat', new Date(task.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }))}
          <p>📅 Due: <span className="font-semibold text-red-600">{task.due_date ?? '-'}</span></p>
          {safety ? <>
            {info('STOP 6', STOP6[task.stop6])}
            {info('Rank', task.rank)}
            {task.kaizen && info('Saran Kaizen', labels(KAIZEN, task.kaizen))}
          </> : <>
            {info('5R', FIVE_R[task.five_r])}
            {info('SQCDM', labels(SQCDM, task.sqcdm))}
          </>}
        </div>
        <SignedImg path={task.photo_before} alt="Foto before" />
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4 p-4">
        <div className={CARD}>
          <h3 className="flex items-center gap-2 border-b pb-2 font-bold text-gray-900"><Wrench size={18} /> Form Tindakan (After)</h3>

          <PhotoInput label="Foto After (Bukti Selesai) - WAJIB" />
          <p className="text-xs text-gray-500">Tanggal dan jam selesai tercatat otomatis saat dikirim.</p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={busy} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-4 font-bold text-white shadow-lg hover:bg-gray-700 disabled:opacity-50">
          <CheckCircle size={20} /> {busy ? 'Mengirim...' : 'TUNTASKAN TEMUAN'}
        </button>
      </form>
    </div>
  )
}
