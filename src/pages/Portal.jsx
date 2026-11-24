import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, ArrowLeft, BarChart3, Calendar, Camera, CheckCircle, ChevronRight, ClipboardEdit, ClipboardList, HardHat, Home as HomeIcon, LogOut, Users, Wrench } from 'lucide-react'
import { api, logout } from '../api'
import CreateForm from './CreateForm'
import Kelola from './Kelola'
import Rekap from './Rekap'
import ResolveForm from './ResolveForm'
import TaskList, { Due } from './TaskList'
import { CARD, CARD_TITLE, Skeleton, TYPE, today } from '../ui'

// Form dibatasi lebih sempit, rata kiri.
const WIDTH = { CREATE: '[&>*]:max-w-3xl', RESOLVE: '[&>*]:max-w-3xl' }
const ROLE = { user: 'User (Auditor & PIC)', admin: 'Admin', superadmin: 'Superadmin' }
const TITLE = { HOME: 'Beranda', CREATE: 'Lapor Temuan', TASK_LIST: 'Daftar Tugas', RESOLVE: 'Tutup Temuan', REKAP: 'Rekap & Grafik', KELOLA: 'Kelola Akun & Data' }
const WHITE_BTN = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-bold text-gray-950 shadow-sm transition hover:bg-gray-200 enabled:active:scale-[0.98]'

// Menu per peran: sidebar (desktop) dan menu bawah (HP) memakai daftar yang sama, maks. 4 item.
// [layar, label pendek, label panjang, ikon]. RESOLVE = bagian dari TASK_LIST.
function menu(p) {
  if (!p.is_admin) return [['HOME', 'Beranda', 'Beranda', HomeIcon], ['CREATE', 'Lapor', 'Lapor Temuan', ClipboardEdit], ['TASK_LIST', 'Tugas', 'Tugas Perbaikan', Wrench]]
  return [['HOME', 'Beranda', 'Beranda', HomeIcon], ['TASK_LIST', 'Temuan', 'Semua Temuan', ClipboardList], ['REKAP', 'Rekap', 'Rekap & Grafik', BarChart3],
    ...(p.role === 'superadmin' ? [['KELOLA', 'Kelola', 'Kelola Akun & Data', Users]] : [])]
}

// Layar pindah lewat state, dicatat di riwayat browser (history.pushState) agar tombol Back HP/browser
// kembali ke layar sebelumnya, bukan keluar aplikasi.
// ponytail: tanpa router/URL per layar; muat ulang halaman selalu kembali ke Beranda.
export default function Portal({ profile }) {
  const [view, setView] = useState('HOME') // HOME, CREATE, TASK_LIST, RESOLVE, REKAP, KELOLA
  const [tasks, setTasks] = useState(null)
  const [taskErr, setTaskErr] = useState('')
  const [selected, setSelected] = useState(null)
  const [toast, setToast] = useState('')
  const heading = useRef(null)
  const shown = useRef('HOME')
  const dept = profile.departments?.name ?? (profile.role === 'superadmin' ? 'Superadmin' : 'Admin')
  const items = menu(profile)

  // Tugas = temuan Open untuk departemen sendiri. Admin: semua temuan, Open dulu.
  const loadTasks = useCallback(() => {
    api('/tasks').then((d) => { setTasks(d); setTaskErr('') }, (e) => { setTasks([]); setTaskErr(e.message) })
  }, [])

  useEffect(() => { loadTasks() }, [loadTasks])

  useEffect(() => {
    history.replaceState({ v: 'HOME' }, '')
    const onBack = (e) => setView(e.state?.v ?? 'HOME')
    addEventListener('popstate', onBack)
    return () => removeEventListener('popstate', onBack)
  }, [])

  // Layar baru: mulai dari atas, fokus ke judul (pembaca layar tahu layar berganti). Tidak saat halaman pertama dibuka.
  useEffect(() => {
    if (shown.current === view) return
    shown.current = view
    scrollTo(0, 0)
    heading.current?.focus()
  }, [view])

  const go = (v) => { if (v !== view) { history.pushState({ v }, ''); setView(v) } }
  const back = () => history.back()
  const pick = (t) => { setSelected(t); go('RESOLVE') }

  // Selesai kirim: kembali ke layar sebelumnya, jadi form yang sudah terkirim tidak bisa dibuka lagi lewat Back.
  function done(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
    loadTasks()
    back()
  }

  const title = view === 'TASK_LIST' && profile.is_admin ? 'Semua Temuan' : TITLE[view]
  const active = view === 'RESOLVE' ? 'TASK_LIST' : view
  const open = tasks?.filter((t) => t.status === 'open').length
  const badge = (v) => (v === 'TASK_LIST' && open > 0 ? open : 0)
  const initials = profile.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-dvh">
      {/* Bukan href="#isi": perubahan hash memicu popstate dan mengembalikan ke Beranda. */}
      <a href="#isi" onClick={(e) => { e.preventDefault(); document.getElementById('isi').focus() }}
        className="sr-only rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-lg focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50">
        Lewati ke isi
      </a>

      {/* ===== Sidebar (desktop) ===== */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-gray-950 text-gray-300 lg:flex">
        <button onClick={() => go('HOME')} className="flex items-center gap-3 border-b border-white/10 px-5 py-5 text-left" aria-label="Ke Beranda">
          <img src="/logo.jpg" alt="" className="h-10 w-10 shrink-0 rounded-full bg-white ring-2 ring-white/20" />
          <span className="leading-tight">
            <span className="block text-sm font-bold tracking-wide text-white">SAFETY PATROL</span>
            <span className="block text-xs text-gray-400">& 5S/5R · PT YFI</span>
          </span>
        </button>
        <nav aria-label="Menu utama" className="flex flex-1 flex-col gap-1 p-3">
          <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-widest text-gray-500">Menu</p>
          {items.map(([v, , label, Icon]) => (
            <button key={v} onClick={() => go(v)} aria-current={active === v ? 'page' : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors ${active === v ? 'bg-white text-gray-950' : 'hover:bg-white/10 hover:text-white'}`}>
              <Icon size={18} aria-hidden="true" />
              <span className="flex-1 text-left">{label}</span>
              {badge(v) > 0 && <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold tabular-nums text-white">{badge(v)}</span>}
            </button>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white ring-1 ring-white/20">{initials}</span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-sm font-medium text-white">{profile.name}</span>
              <span className="block truncate text-xs text-gray-400">{dept} · {ROLE[profile.role].split(' ')[0]}</span>
            </span>
          </div>
          <button onClick={logout} className="mt-1 flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white">
            <LogOut size={18} aria-hidden="true" /> Keluar
          </button>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col lg:pl-64">
        {/* ===== Bar atas (HP & tablet) ===== */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 bg-gray-950 px-4 text-white lg:hidden">
          <button onClick={() => go('HOME')} className="flex min-w-0 items-center gap-3 text-left" aria-label="Ke Beranda">
            <img src="/logo.jpg" alt="" className="h-9 w-9 shrink-0 rounded-full bg-white" />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-bold tracking-wide">SAFETY PATROL & 5S/5R</span>
              <span className="block truncate text-xs text-gray-400">{profile.name} · {dept}</span>
            </span>
          </button>
          <button onClick={logout} aria-label="Keluar" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-gray-300 hover:bg-white/10 hover:text-white">
            <LogOut size={20} />
          </button>
        </header>

        {/* ===== Judul layar ===== */}
        <div className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-4 lg:px-8 lg:py-5">
            {view === 'RESOLVE' && (
              <button onClick={back} className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-gray-700 transition-colors hover:bg-gray-100" aria-label="Kembali ke Daftar Tugas">
                <ArrowLeft size={20} />
              </button>
            )}
            <div className="min-w-0">
              <h1 ref={heading} tabIndex={-1} className="text-xl font-bold tracking-tight text-gray-950 outline-none lg:text-2xl">{title}</h1>
              {view === 'HOME' && <p className="text-sm text-gray-500">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>}
              {view === 'RESOLVE' && <p className="text-sm text-gray-500">Daftar Tugas / {selected?.code}</p>}
            </div>
          </div>
        </div>

        <div role="status" aria-live="polite">
          {toast && (
            <div className="fixed left-1/2 top-20 z-50 w-max max-w-[90%] -translate-x-1/2 lg:left-[calc(50%+8rem)]">
              <div className="flex animate-muncul items-center gap-2 rounded-md bg-gray-950 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
                <CheckCircle size={16} aria-hidden="true" /> {toast}
              </div>
            </div>
          )}
        </div>

        <main id="isi" tabIndex={-1} className={`mx-auto w-full max-w-6xl flex-1 pb-24 outline-none lg:px-4 lg:pb-8 ${WIDTH[view] ?? ''}`}>
          <div key={view} className="animate-muncul">
            {view === 'HOME' && <Home profile={profile} tasks={tasks} error={taskErr} go={go} pick={pick} />}
            {view === 'CREATE' && <CreateForm onDone={() => done('Temuan berhasil dilaporkan.')} />}
            {view === 'TASK_LIST' && (profile.is_admin
              ? <TaskList tasks={tasks} error={taskErr} />
              : <TaskList tasks={tasks} error={taskErr} dept={dept} onPick={pick} />)}
            {view === 'REKAP' && <Rekap />}
            {view === 'KELOLA' && <Kelola />}
            {view === 'RESOLVE' && <ResolveForm task={selected} onDone={() => done('Tugas perbaikan berhasil ditutup.')} />}
          </div>
        </main>

        <footer className="hidden border-t border-gray-200 bg-white px-4 py-4 text-center text-xs text-gray-500 lg:block">
          © {new Date().getFullYear()} PT Yahata Fastener Indonesia · Sistem Informasi Safety Patrol & 5S/5R · Penggunaan internal
        </footer>
      </div>

      {/* ===== Menu bawah (HP & tablet) ===== */}
      <nav aria-label="Menu utama" className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className={`mx-auto grid max-w-md ${items.length === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
          {items.map(([v, label, , Icon]) => (
            <button key={v} onClick={() => go(v)} aria-current={active === v ? 'page' : undefined}
              className={`relative flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${active === v ? 'text-gray-950' : 'text-gray-500 hover:text-gray-900'}`}>
              {active === v && <span aria-hidden="true" className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-gray-950" />}
              <span className="relative">
                <Icon size={22} strokeWidth={active === v ? 2.25 : 1.75} aria-hidden="true" />
                {badge(v) > 0 && <span className="absolute -right-2.5 -top-1.5 min-w-5 rounded-full bg-red-600 px-1 text-center text-[10px] font-bold leading-4 tabular-nums text-white ring-2 ring-white">{badge(v)}</span>}
              </span>
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

// ===== Beranda: dashboard ringkas. Angka dihitung dari /api/tasks (user: Open departemen sendiri; admin: semua). =====
function Home({ profile, tasks, error, go, pick }) {
  const now = today()
  const week = new Date(Date.now() + 7 * 864e5).toLocaleDateString('sv')
  const open = tasks?.filter((t) => t.status === 'open') ?? []
  const late = open.filter((t) => t.due_date && t.due_date < now).length
  const soon = open.filter((t) => t.due_date && t.due_date >= now && t.due_date <= week).length
  const stats = profile.is_admin
    ? [['Temuan Open', open.length, ClipboardList], ['Terlambat', late, AlertTriangle, late > 0], ['Sudah Ditutup', (tasks?.length ?? 0) - open.length, CheckCircle]]
    : [['Tugas Open', open.length, Wrench], ['Terlambat', late, AlertTriangle, late > 0], ['Tenggat ≤ 7 Hari', soon, Calendar]]
  const nearest = open.slice(0, 5) // API sudah mengurutkan tenggat terdekat dulu

  return (
    <div className="flex flex-col gap-4 p-4 lg:gap-6 lg:py-6">
      <section className="relative overflow-hidden rounded-xl bg-gray-950 p-5 text-white shadow-sm sm:p-6">
        {/* Garis diagonal tipis = motif rambu K3, tetap monokrom. Dekoratif saja. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-[0.07] [background:repeating-linear-gradient(-45deg,#fff_0_12px,transparent_12px_28px)] [mask-image:linear-gradient(to_left,#000,transparent)]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-400">Selamat datang,</p>
            <h2 className="text-2xl font-bold tracking-tight">{profile.name}</h2>
            <p className="mt-1 text-sm text-gray-300">{profile.departments?.name ?? 'Semua departemen'} · {ROLE[profile.role]}</p>
          </div>
          {profile.is_admin
            ? <button onClick={() => go('REKAP')} className={WHITE_BTN}><BarChart3 size={18} aria-hidden="true" /> Buka Rekap & Grafik</button>
            : <button onClick={() => go('CREATE')} className={WHITE_BTN}><ClipboardEdit size={18} aria-hidden="true" /> Lapor Temuan Baru</button>}
        </div>
      </section>

      {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">Gagal memuat tugas: {error}</p>}

      {!tasks ? <Skeleton n={3} h="h-24" className="grid grid-cols-3 gap-3" /> : (
        <div className="grid grid-cols-3 gap-3">
          {stats.map(([label, value, Icon, danger]) => (
            <div key={label} className={`flex flex-col justify-between rounded-lg border bg-white p-3 shadow-xs sm:p-4 ${danger ? 'border-red-200' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium leading-tight text-gray-500 sm:text-sm">{label}</p>
                <Icon size={18} aria-hidden="true" className={`hidden shrink-0 sm:block ${danger ? 'text-red-600' : 'text-gray-400'}`} />
              </div>
              <p className={`mt-2 text-2xl font-bold tabular-nums sm:text-3xl ${danger ? 'text-red-600' : 'text-gray-950'}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3 lg:gap-6 [&>*]:min-w-0">
        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-4 py-3 sm:px-5">
            <h3 className="text-base font-semibold text-gray-900">Tenggat terdekat</h3>
            <button onClick={() => go('TASK_LIST')} className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-950">
              Lihat semua <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
          {!tasks ? <Skeleton n={3} h="h-16" className="flex flex-col gap-2 p-4" /> : nearest.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100"><CheckCircle size={24} aria-hidden="true" /></span>
              <p className="font-semibold text-gray-900">Tidak ada temuan Open</p>
              <p className="text-sm text-gray-500">Semua temuan sudah ditutup.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {nearest.map((t) => (
                <li key={t.id}>
                  <button onClick={() => (profile.is_admin ? go('TASK_LIST') : pick(t))}
                    className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 sm:px-5">
                    <span className={`w-12 shrink-0 rounded px-1.5 py-0.5 text-center text-xs font-semibold ${t.type === 'safety' ? 'bg-gray-950 text-white' : 'bg-gray-200 text-gray-800'}`}>{TYPE[t.type]}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-gray-900">{t.description}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                        <span className="font-mono">{t.code}</span>
                        <span className="truncate">{t.areas?.name}</span>
                        <Due date={t.due_date} late={t.due_date && t.due_date < now} />
                      </span>
                    </span>
                    <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-900" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="flex flex-col gap-4">
          <section className="flex gap-3 rounded-lg border-2 border-gray-950 bg-white p-4">
            <HardHat size={22} aria-hidden="true" className="shrink-0" />
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-gray-950">Utamakan K3</h3>
              <p className="mt-1 text-sm text-gray-600">Selalu gunakan APD saat berkeliling area pabrik.</p>
            </div>
          </section>
          <section className={CARD}>
            <h3 className={CARD_TITLE}>Alur Temuan</h3>
            <ol className="-mt-1 flex flex-col gap-3 text-sm">
              {[[ClipboardEdit, 'Auditor melapor', 'Foto Before + detail temuan'], [Camera, 'PIC memperbaiki', 'Departemen tujuan mengirim foto After'], [CheckCircle, 'Closed', 'Status tertutup otomatis']].map(([Icon, a, b], i) => (
                <li key={a} className="flex gap-3">
                  <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-900"><Icon size={16} /></span>
                  <span><span className="font-semibold text-gray-900">{i + 1}. {a}</span><span className="block text-gray-500">{b}</span></span>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  )
}
