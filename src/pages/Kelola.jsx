import { useEffect, useState } from 'react'
import { CheckCircle, Building2, MapPin, TriangleAlert, UserPlus, Users } from 'lucide-react'
import { api } from '../api'
import { BTN, CARD, CARD_TITLE, INPUT, PasswordInput, Select, Skeleton, useDialog } from '../ui'

const ROLE = { user: 'User', admin: 'Admin', superadmin: 'Superadmin' }
const MINI = 'min-h-8 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-gray-900 hover:bg-gray-50'
const SMALL = 'min-h-8 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs'
const Title = ({ icon: Icon, children }) => <h3 className={`${CARD_TITLE} flex items-center gap-2`}><Icon size={18} aria-hidden="true" />{children}</h3>

// Layar superadmin: akun, departemen, area. Hapus ditolak backend bila sudah dipakai temuan/akun.
// Aturan isian (email/nama ganda, user wajib departemen) dijaga backend; pesannya tampil di atas.
export default function Kelola() {
  const [users, setUsers] = useState(null)
  const [master, setMaster] = useState(null)
  const [msg, setMsg] = useState(null) // { t, err }
  const [dialog, dialogEl] = useDialog()

  const load = () => Promise.all([api('/users'), api('/master')]).then(([u, m]) => { setUsers(u); setMaster(m) }, (e) => setMsg({ t: e.message, err: true }))
  useEffect(() => { load() }, [])

  // Semua aksi lewat sini: kirim, tampilkan hasil, muat ulang. true = berhasil.
  const run = (path, body, ok, method = 'POST') => api(path, { body, method })
    .then(() => { setMsg({ t: ok }); load(); return true }, (e) => { setMsg({ t: e.message, err: true }); return false })
  const rename = async (path, name) => { const n = await dialog({ title: 'Ubah nama', text: `Nama baru untuk "${name}":`, input: name }); if (n) run(path, { name: n }, 'Nama diubah.', 'PATCH') }
  const del = async (path, name) => { if (await dialog({ title: `Hapus "${name}"?`, text: 'Data yang dihapus tidak bisa dikembalikan.', ok: 'Hapus', danger: true })) run(path, undefined, `${name} dihapus.`, 'DELETE') }

  async function addUser(e) {
    const form = e.currentTarget
    e.preventDefault()
    const data = Object.fromEntries(new FormData(form))
    if (await run('/users', { ...data, dept_id: data.dept_id || null }, `Akun ${data.name} dibuat.`)) form.reset()
  }

  if (!users) return msg
    ? <p role="alert" className="m-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{msg.t}</p>
    : <Skeleton n={3} h="h-40" className="flex flex-col gap-4 p-4" />
  const depts = master.departments.map((d) => [d.id, d.name])

  const masterCard = (table, title) => (
    <div className={CARD}>
      <Title icon={table === 'areas' ? MapPin : Building2}>{title} <span className="font-normal text-gray-500">({master[table].length})</span></Title>
      <ul className="-mt-2 divide-y divide-gray-100 text-sm">
        {master[table].map((x) => (
          <li key={x.id} className="flex items-center justify-between gap-2 py-2">
            {x.name}
            <span className="space-x-1 whitespace-nowrap">
              <button className={MINI} onClick={() => rename(`/master/${table}/${x.id}`, x.name)}>Ubah nama</button>
              <button className={`${MINI} text-red-600`} onClick={() => del(`/master/${table}/${x.id}`, x.name)}>Hapus</button>
            </span>
          </li>
        ))}
      </ul>
      <form className="flex gap-2" onSubmit={async (e) => { const f = e.currentTarget; e.preventDefault(); if (await run(`/master/${table}`, { name: f.nama.value }, `${f.nama.value} ditambahkan.`)) f.reset() }}>
        <input name="nama" required aria-label={`Nama ${title.toLowerCase()} baru`} placeholder={`Tambah ${title.toLowerCase()} baru`} className={`${INPUT} mt-0`} />
        <button className={BTN}>Tambah</button>
      </form>
    </div>
  )

  return (
    <div className="flex flex-col gap-4 p-4 pb-8">
      {dialogEl}
      <div role="status" aria-live="polite">{msg && (
        <p className={`flex animate-muncul items-start gap-2 rounded-md border px-3 py-2.5 text-sm font-medium ${msg.err ? 'border-red-200 bg-red-50 text-red-700' : 'border-gray-300 bg-white text-gray-900'}`}>
          {msg.err ? <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> : <CheckCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />}{msg.t}
        </p>)}
      </div>

      <form onSubmit={addUser} className={CARD}>
        <Title icon={UserPlus}>Tambah Akun</Title>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-gray-700">Nama<input name="name" required className={INPUT} /></label>
          <label className="block text-sm font-medium text-gray-700">NIK <span className="font-normal text-gray-500">(untuk masuk lewat Superapps; boleh menyusul)</span>
            <input name="nik" autoComplete="off" className={INPUT} />
          </label>
          <label className="block text-sm font-medium text-gray-700">Email<input name="email" type="email" required className={INPUT} /></label>
          <Select label="Departemen (wajib untuk User)" name="dept_id" options={depts} required={false} />
          <Select label="Peran" name="role" options={ROLE} />
          <label className="block text-sm font-medium text-gray-700">Password awal (min. 8 karakter)
            <PasswordInput name="password" minLength={8} required autoComplete="new-password" />
          </label>
        </div>
        <button className={`${BTN} sm:self-end sm:px-8`}>Simpan Akun</button>
      </form>

      <div className={`${CARD} overflow-x-auto`}>
        <Title icon={Users}>Daftar Akun <span className="font-normal text-gray-500">({users.length})</span></Title>
        <table className="w-full text-left text-xs [&_td]:px-3 [&_td]:py-2.5">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
            <tr>{['Nama / Email', 'NIK', 'Departemen', 'Peran', 'Status', 'Aksi'].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => {
              const patch = (body, ok) => run(`/users/${u.id}`, body, ok, 'PATCH')
              return (
                <tr key={u.id} className={u.active ? 'hover:bg-gray-50' : 'text-gray-400'}>
                  <td>
                    <span className="flex items-center gap-2.5">
                      <span aria-hidden="true" className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${u.active ? 'bg-gray-950 text-white' : 'bg-gray-200 text-gray-500'}`}>{u.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()}</span>
                      <span><b className="block font-semibold">{u.name}</b><span className="text-gray-500">{u.email}</span></span>
                    </span>
                  </td>
                  <td className="whitespace-nowrap">{u.nik ? <span className="font-mono">{u.nik}</span> : <span className="text-gray-400">Belum ada</span>}</td>
                  <td>
                    <select value={u.dept_id ?? ''} className={SMALL} onChange={(e) => patch({ dept_id: e.target.value || null }, `Departemen ${u.name} diubah.`)}>
                      <option value="">-</option>
                      {depts.map(([id, n]) => <option key={id} value={id}>{n}</option>)}
                    </select>
                  </td>
                  <td>
                    <select value={u.role} className={`${SMALL} ${u.role === 'user' ? '' : 'font-semibold'}`} onChange={(e) => patch({ role: e.target.value }, `Peran ${u.name} diubah.`)}>
                      {Object.entries(ROLE).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                    </select>
                  </td>
                  <td><span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-semibold ring-1 ${u.active ? 'bg-white text-gray-900 ring-gray-300' : 'bg-gray-50 text-gray-500 ring-gray-200'}`}><i aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${u.active ? 'bg-gray-950' : 'bg-gray-300'}`} />{u.active ? 'Aktif' : 'Nonaktif'}</span></td>
                  <td className="min-w-60 [&>button]:m-0.5">
                    <button className={MINI} onClick={() => rename(`/users/${u.id}`, u.name)}>Nama</button>
                    <button className={MINI} onClick={async () => { const n = await dialog({ title: u.nik ? 'Ubah NIK' : 'Isi NIK', text: `NIK untuk ${u.name}. Dipakai untuk login dan masuk lewat Superapps.`, input: u.nik ?? '' }); if (n) patch({ nik: n }, `NIK ${u.name} disimpan.`) }}>NIK</button>
                    <button className={MINI} onClick={async () => { const p = await dialog({ title: 'Reset password', text: `Password baru untuk ${u.email} (min. 8 karakter):`, input: '', type: 'password', minLength: 8 }); if (p) patch({ password: p }, `Password ${u.email} direset.`) }}>Password</button>
                    <button className={MINI} onClick={() => patch({ active: !u.active }, `${u.name} ${u.active ? 'dinonaktifkan' : 'diaktifkan'}.`)}>
                      {u.active ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                    <button className={`${MINI} text-red-600`} onClick={() => del(`/users/${u.id}`, u.name)}>Hapus</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="text-xs text-gray-500">Departemen kosong hanya untuk Admin/Superadmin. Akun tanpa NIK tetap bisa login dengan email, tetapi tidak bisa masuk lewat Superapps.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 [&>*]:min-w-0">
        {masterCard('departments', 'Departemen')}
        {masterCard('areas', 'Area')}
      </div>
    </div>
  )
}
