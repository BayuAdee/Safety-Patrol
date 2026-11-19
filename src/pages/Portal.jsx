import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, BarChart3, CheckCircle, ChevronRight, ClipboardEdit, Info, LogOut, ShieldAlert, Wrench } from 'lucide-react'
import { supabase } from '../supabase'
import CreateForm from './CreateForm'
import Rekap from './Rekap'
import ResolveForm from './ResolveForm'
import TaskList from './TaskList'

const TITLE = { HOME: 'YFI Patrol', CREATE: 'Lapor Temuan', TASK_LIST: 'Daftar Tugas', RESOLVE: 'Tutup Temuan', REKAP: 'Rekap Temuan' }

// Tampilan dari yfi_patrol_user_portal.tsx. Layar pindah lewat state, seperti mockup.
export default function Portal({ profile }) {
  const [view, setView] = useState('HOME') // HOME, CREATE, TASK_LIST, RESOLVE, REKAP
  const [tasks, setTasks] = useState(null)
  const [taskErr, setTaskErr] = useState('')
  const [selected, setSelected] = useState(null)
  const [toast, setToast] = useState('')
  const dept = profile.departments?.name ?? 'Admin'

  // Tugas = temuan Open untuk departemen sendiri. Admin tanpa departemen: semua yang Open.
  const loadTasks = useCallback(() => {
    let q = supabase.from('v_findings').select('*, areas(name)').eq('status', 'open')
      .order('due_date', { nullsFirst: false }).order('created_at')
    if (profile.dept_id) q = q.eq('target_dept_id', profile.dept_id)
    q.then(({ data, error }) => { setTasks(data ?? []); setTaskErr(error?.message ?? '') })
  }, [profile.dept_id])

  useEffect(() => { loadTasks() }, [loadTasks])

  function done(msg, next) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
    loadTasks()
    setView(next)
  }

  const home = (
    <div className="flex flex-col gap-6 p-4">
      <div className="relative overflow-hidden rounded-2xl bg-gray-900 p-6 text-white shadow-lg">
        <div className="absolute -right-4 -top-4 opacity-10"><ShieldAlert size={120} /></div>
        <h2 className="mb-1 text-2xl font-bold">Halo, {profile.name}!</h2>
        <p className="mb-4 text-gray-300">Departemen: {dept}</p>
        <p className="rounded-lg border border-gray-700 bg-gray-800 p-3 text-sm">
          <Info size={16} className="-mt-1 mr-2 inline" />
          Pastikan Anda selalu menggunakan APD saat berkeliling area pabrik.
        </p>
      </div>

      <MenuButton onClick={() => setView('CREATE')} border="border-gray-900" iconCls="bg-gray-100 text-gray-900" icon={<ClipboardEdit size={24} />}
        title="Buat Temuan Baru" sub="Lapor form Safety / 5S (Auditor)" />
      <MenuButton onClick={() => setView('TASK_LIST')} border="border-gray-300" iconCls="bg-gray-100 text-gray-900" badge={tasks?.length} icon={<Wrench size={24} />}
        title="Tugas Perbaikan" sub={`Area ${dept} (PIC)`} />
      {profile.is_admin && <MenuButton onClick={() => setView('REKAP')} border="border-gray-300" iconCls="bg-gray-100 text-gray-900" icon={<BarChart3 size={24} />}
        title="Rekap & Grafik" sub="Safety & 5S per semester (Admin)" />}
    </div>
  )

  return (
    <div className="flex min-h-screen justify-center bg-gray-200">
      <div className={`flex w-full ${view === 'REKAP' ? 'max-w-5xl' : 'max-w-md'} flex-col bg-gray-100`}>
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between bg-gray-900 p-4 text-white shadow-md">
          <div className="flex items-center gap-3">
            {view === 'HOME'
              ? <img src="/logo.jpg" alt="Logo YFI" className="h-9 w-9 rounded-full" />
              : <button onClick={() => setView(view === 'RESOLVE' ? 'TASK_LIST' : 'HOME')} className="rounded-full p-1 hover:bg-gray-800" aria-label="Kembali"><ArrowLeft size={24} /></button>}
            <h1 className="text-lg font-bold">{TITLE[view]}</h1>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-1 rounded-full border border-gray-700 bg-gray-800 px-3 py-1 text-xs font-bold">
            <LogOut size={14} /> Keluar
          </button>
        </header>

        {toast && (
          <div className="fixed left-1/2 top-20 z-50 flex w-max max-w-[90%] -translate-x-1/2 items-center gap-2 rounded-full bg-gray-800 px-4 py-2 text-sm font-medium text-white shadow-lg">
            <CheckCircle size={16} className="text-white" /> {toast}
          </div>
        )}

        {view === 'HOME' && home}
        {view === 'CREATE' && <CreateForm onDone={() => done('Temuan berhasil dilaporkan!', 'HOME')} />}
        {view === 'TASK_LIST' && <TaskList tasks={tasks} error={taskErr} dept={dept} onPick={(t) => { setSelected(t); setView('RESOLVE') }} />}
        {view === 'REKAP' && <Rekap />}
        {view === 'RESOLVE' && <ResolveForm task={selected} onDone={() => done('Tugas perbaikan berhasil ditutup!', 'TASK_LIST')} />}
      </div>
    </div>
  )
}

function MenuButton({ onClick, border, iconCls, icon, title, sub, badge }) {
  return (
    <button onClick={onClick} className={`flex items-center justify-between rounded-2xl border-2 ${border} bg-white p-5 shadow-sm transition-all hover:shadow-md active:scale-95`}>
      <div className="flex items-center gap-4">
        <div className={`relative flex h-12 w-12 items-center justify-center rounded-full ${iconCls}`}>
          {icon}
          {badge > 0 && <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">{badge}</span>}
        </div>
        <div className="text-left">
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
          <p className="text-xs text-gray-500">{sub}</p>
        </div>
      </div>
      <ChevronRight className="text-gray-400" />
    </button>
  )
}
