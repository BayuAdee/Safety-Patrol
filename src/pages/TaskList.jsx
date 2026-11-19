import { Calendar, CheckCircle, MapPin } from 'lucide-react'
import { TYPE } from '../ui'

// Layar TASK_LIST. Data dimuat di Portal (dipakai juga untuk badge di HOME).
export default function TaskList({ tasks, error, dept, onPick }) {
  if (error) return <p className="p-6 text-red-600">Gagal memuat tugas: {error}</p>
  if (!tasks) return <p className="p-6 text-gray-500">Memuat...</p>

  return (
    <div className="p-4">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Tugas Area {dept}</h2>
          <p className="text-sm text-gray-500">Temuan berstatus Open</p>
        </div>
        <div className="rounded-full border border-gray-300 bg-gray-100 px-3 py-1 text-sm font-bold text-gray-700">{tasks.length} Tugas</div>
      </div>

      {tasks.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 text-gray-900"><CheckCircle size={40} /></div>
          <h3 className="mb-1 text-lg font-bold text-gray-800">Hore! Area Anda Bersih</h3>
          <p className="text-sm text-gray-500">Tidak ada temuan terbuka untuk departemen {dept}. Pertahankan!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {tasks.map((t) => (
            <button key={t.id} onClick={() => onPick(t)} className="rounded-xl border-l-4 border-l-red-500 bg-white p-4 text-left shadow-sm hover:shadow-md">
              <div className="mb-2 flex items-start justify-between">
                <span className={`rounded px-2 py-1 text-xs font-bold ${t.type === 'safety' ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-700'}`}>{TYPE[t.type]} Patrol</span>
                <span className="font-mono text-xs text-gray-400">{t.code}</span>
              </div>
              <h3 className="mb-1 line-clamp-1 font-bold text-gray-800">{t.description}</h3>
              <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1"><MapPin size={12} /> {t.areas?.name}</span>
                <span className="flex items-center gap-1 font-semibold text-red-500"><Calendar size={12} /> Due: {t.due_date ?? '-'}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
