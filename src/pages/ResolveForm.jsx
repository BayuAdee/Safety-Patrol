import { useState } from 'react'
import { AlertTriangle, CheckCircle, Wrench } from 'lucide-react'
import { insertWithPhoto } from '../api'
import { BTN, CARD, CARD_TITLE, FIVE_R, FOUR_M, KAIZEN, PhotoInput, SQCDM, STOP6, ScoreInput, SignedImg, TYPE, labels } from '../ui'

// Layar RESOLVE (tahap After): foto; Safety juga poin After (rank dihitung database). Insert ke resolutions = Closed; closed_at diisi database.
export default function ResolveForm({ task, onDone }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const safety = task.type === 'safety'

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await insertWithPhoto('resolutions', e.target, { finding_id: task.id })
      onDone()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  const info = (k, v, cls = 'text-gray-900') => <div><dt className="text-xs text-gray-500">{k}</dt><dd className={`text-sm font-medium ${cls}`}>{v}</dd></div>

  return (
    <div className="flex flex-col gap-4 p-4 pb-8">
      <section className="overflow-hidden rounded-lg border border-red-200 bg-white">
        <div className="flex items-center justify-between gap-2 border-b border-red-200 bg-red-50 px-4 py-3">
          <h2 className="flex items-center gap-2 text-base font-semibold text-red-800"><AlertTriangle size={18} aria-hidden="true" /> Detail Temuan (Before)</h2>
          <span className="rounded border border-red-200 bg-white px-2 py-0.5 font-mono text-xs text-red-800">{task.code}</span>
        </div>
        <div className="flex flex-col gap-4 p-4">
          <p className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-900">{task.description}</p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            {info('Area', task.areas?.name)}
            {info('Jenis', TYPE[task.type])}
            {info('Akar Masalah (4M)', labels(FOUR_M, task.four_m))}
            {info('Dibuat', new Date(task.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }))}
            {info('Tenggat', task.due_date ?? '-', 'text-red-600')}
          {safety ? <>
            {info('STOP 6', STOP6[task.stop6])}
            {info('Rank', `${task.rank} (${task.score} poin)`)}
            {task.kaizen && info('Saran Kaizen', labels(KAIZEN, task.kaizen))}
          </> : <>
            {info('5R', FIVE_R[task.five_r])}
            {info('SQCDM', labels(SQCDM, task.sqcdm))}
          </>}
          </dl>
          <SignedImg path={task.photo_before} alt="Foto before" />
        </div>
      </section>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className={CARD}>
          <h2 className={`${CARD_TITLE} flex items-center gap-2`}><Wrench size={18} aria-hidden="true" /> Form Tindakan (After)</h2>

          {safety && <ScoreInput suffix="_after" />}
          <PhotoInput label="Foto After (Bukti Selesai) - WAJIB" />
          <p className="text-xs text-gray-500">Tanggal dan jam selesai tercatat otomatis saat dikirim.</p>
        </div>

        {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button disabled={busy} className={`${BTN} w-full py-3 sm:ml-auto sm:w-auto sm:px-8`}>
          <CheckCircle size={18} aria-hidden="true" /> {busy ? 'Mengirim...' : 'Tutup Temuan'}
        </button>
      </form>
    </div>
  )
}
