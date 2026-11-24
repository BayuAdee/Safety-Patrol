import { useEffect, useState } from 'react'
import { AlertTriangle, Building2, Calendar, CheckCircle, MapPin } from 'lucide-react'
import { api } from '../api'
import { INPUT, Skeleton, TYPE, tgl, today } from '../ui'

const BADGE = 'rounded px-2 py-0.5 text-xs font-semibold'

// Layar TASK_LIST. Data dimuat di Portal (dipakai juga untuk badge di HOME).
// Tanpa onPick = mode admin: semua temuan Open & Closed, hanya dilihat.
export default function TaskList({ tasks: all, error, dept, onPick }) {
  const [pick, setPick] = useState('') // admin: filter departemen tujuan, '' = semua
  const [depts, setDepts] = useState([]) // admin: semua departemen, termasuk yang belum punya temuan
  useEffect(() => { if (!onPick) api('/master').then((m) => setDepts(m.departments.map((d) => d.name)), () => {}) }, [onPick])
  const tasks = pick ? all?.filter((t) => t.target_dept === pick) : all
  const open = tasks?.filter((t) => t.status === 'open').length
  if (error) return <p role="alert" className="m-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">Gagal memuat tugas: {error}</p>
  if (!tasks) return <Skeleton n={6} />
  const now = today()

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{onPick ? `Tugas Area ${dept}` : 'Daftar Temuan'}</h2>
          <p className="text-sm tabular-nums text-gray-500">{onPick ? `${tasks.length} temuan berstatus Open` : `${tasks.length} temuan: ${open} Open, ${tasks.length - open} Closed`}</p>
        </div>
        {!onPick && (
          <label className="block w-full text-sm font-medium text-gray-700 sm:w-64">
            Departemen tujuan
            <select value={pick} onChange={(e) => setPick(e.target.value)} className={INPUT}>
              <option value="">Semua departemen</option>
              {depts.map((n) => <option key={n}>{n}</option>)}
            </select>
          </label>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-lg border border-gray-200 bg-white p-8 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-900"><CheckCircle size={28} aria-hidden="true" /></div>
          <h3 className="mb-1 text-base font-semibold text-gray-900">{onPick ? 'Tidak ada tugas terbuka' : pick ? `Departemen ${pick}` : 'Belum ada temuan'}</h3>
          {onPick && <p className="text-sm text-gray-500">Semua temuan untuk departemen {dept} sudah ditutup.</p>}
          {pick && <p className="text-sm text-gray-500">Belum ada temuan Open maupun Closed yang ditujukan ke {pick}.</p>}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {tasks.map((t) => (
            <button key={t.id} disabled={!onPick} onClick={() => onPick(t)}
              className={`group rounded-lg border border-l-4 border-gray-200 ${t.status === 'open' ? 'border-l-red-600' : 'border-l-gray-400'} bg-white p-4 text-left shadow-xs transition enabled:hover:border-gray-900 enabled:hover:border-l-red-600 enabled:hover:shadow-md enabled:active:scale-[0.99]`}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <span className={`${BADGE} ${t.type === 'safety' ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-800'}`}>{TYPE[t.type]}</span>
                  {!onPick && <span className={`${BADGE} ${t.status === 'open' ? 'bg-red-50 text-red-700 ring-1 ring-red-200' : 'bg-gray-100 text-gray-700 ring-1 ring-gray-300'}`}>{t.status === 'open' ? 'Open' : 'Closed'}</span>}
                </span>
                <span className="font-mono text-xs text-gray-500">{t.code}</span>
              </div>
              <h3 className="mb-1 line-clamp-2 font-semibold text-gray-900">{t.description}</h3>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                <span className="flex items-center gap-1"><MapPin size={12} aria-hidden="true" /> {t.areas?.name}</span>
                {!onPick && <span className="flex items-center gap-1"><Building2 size={12} aria-hidden="true" /> {t.target_dept}</span>}
                {t.status === 'open' ? <Due date={t.due_date} late={t.due_date && t.due_date < now} />
                  : <span className="flex items-center gap-1"><CheckCircle size={12} aria-hidden="true" /> Ditutup: {tgl(t.closed_at)} oleh {t.closer?.name} ({t.closer?.dept ?? '-'})</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Tenggat lewat = merah + kata "Terlambat" (tidak hanya warna). Belum lewat / kosong = abu.
export function Due({ date, late }) {
  return late
    ? <span className="flex items-center gap-1 rounded bg-red-50 px-1.5 py-0.5 font-semibold text-red-700 ring-1 ring-red-200"><AlertTriangle size={12} aria-hidden="true" /> Terlambat · {tgl(date)}</span>
    : <span className="flex items-center gap-1"><Calendar size={12} aria-hidden="true" /> Tenggat: {tgl(date)}</span>
}
