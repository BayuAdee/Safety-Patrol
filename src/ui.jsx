import { useEffect, useRef, useState } from 'react'
import { Camera, Eye, EyeOff } from 'lucide-react'
import { photoUrl } from './api'

// Kode yang disimpan di database -> label tampilan.
export const TYPE = { safety: 'Safety', '5s': '5S' }
export const FOUR_M = { man: 'Manusia (Man)', machine: 'Mesin (Machine)', material: 'Material (Material)', method: 'Metode (Method)' }
export const STOP6 = { A: 'A: Apparatus', B: 'B: Big Heavy', C: 'C: Car/Vehicle', D: 'D: Drop/Fall', E: 'E: Electric', F: 'F: Fire', O: 'O: Other' }
// Poin Safety (legenda Excel patroli). Disimpan sebagai angka poin; urutan array = urutan di Excel.
const pts = (rows) => rows.map(([p, t]) => [p, `${t} (${p})`])
export const SEVERITY = pts([[12, 'Kecelakaan berat (serius/fatal)'], [6, 'Kecelakaan sedang'], [2, 'Kecelakaan kecil (tidak menyebabkan LWD)']])
export const FREQUENCY = pts([[5, '> 1x seminggu'], [4, '1x sebulan'], [3, '1x setahun']])
export const PROBABILITY = pts([[8, 'Kemungkinan tinggi'], [4, 'Kemungkinan sedang'], [1, 'Kemungkinan rendah']])
// Hanya untuk pratinjau di form. Yang disimpan dihitung database: risk_rank() di migration (ambang sama).
export const rankOf = (score) => (score >= 19 ? 'A' : score >= 10 ? 'B' : 'C')
export const KAIZEN = {
  eliminasi: 'Eliminasi (Menghilangkan Bahaya)',
  substitusi: 'Substitusi (Mengganti Material)',
  modifikasi: 'Modifikasi (Engineering Control)',
  admin: 'Administrasi (SOP / Rambu)',
  apd: 'APD (Alat Pelindung Diri)',
}
export const FIVE_R = { 1: 'R1: Ringkas', 2: 'R2: Rapi', 3: 'R3: Resik', 4: 'R4: Rawat', 5: 'R5: Rajin' }
export const SQCDM = { S: 'S: Safety', Q: 'Q: Quality', C: 'C: Cost', D: 'D: Delivery', M: 'M: Moral' }

// Array kode -> "Label, Label".
export const labels = (map, codes) => codes?.map((k) => map[k]).join(', ') || '-'

// Token gaya bersama (web internal: datar, garis tipis, sudut kecil). Input 16px di HP agar iOS tidak zoom.
export const INPUT = 'mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-base font-normal text-gray-900 shadow-xs outline-none placeholder:text-gray-400 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 sm:text-sm'
export const CARD = 'flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-xs sm:p-5'
export const CARD_TITLE = 'border-b border-gray-200 pb-3 text-base font-semibold text-gray-900'
export const BTN = 'inline-flex items-center justify-center gap-2 rounded-md bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition enabled:active:scale-[0.98] hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50'
export const BTN2 = 'inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition enabled:active:scale-[0.98] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'

// Tanggal tampilan "24 Nov 2026". s = 'YYYY-MM-DD' (dibaca sebagai tanggal lokal) atau waktu ISO.
export const tgl = (s) => (s ? new Date(s.length === 10 ? `${s}T00:00` : s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-')
export const today = () => new Date().toLocaleDateString('sv') // 'YYYY-MM-DD' waktu lokal, bisa dibandingkan sebagai teks

// Kerangka abu selama data dimuat; tinggi mirip isi asli agar layar tidak melompat.
export function Skeleton({ n = 3, h = 'h-32', className = 'grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-3' }) {
  return (
    <div role="status" className={className}>
      <span className="sr-only">Memuat...</span>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} aria-hidden="true" className={`${h} animate-pulse rounded-lg border border-gray-200 bg-white p-4`}>
          <div className="h-3 w-1/3 rounded bg-gray-200" /><div className="mt-3 h-3 w-2/3 rounded bg-gray-100" /><div className="mt-2 h-3 w-1/2 rounded bg-gray-100" />
        </div>
      ))}
    </div>
  )
}

// Pilihan tab (Safety/5S, Per Bulan/Per Semester). items: [[nilai, teks, Ikon?]]
export function Tabs({ value, onChange, items }) {
  return (
    <div className="flex gap-1 rounded-md border border-gray-300 bg-white p-1">
      {items.map(([v, text, Icon]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}
          className={`flex flex-1 items-center justify-center gap-2 rounded px-3 py-2 text-sm font-semibold transition-colors ${value === v ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
          {Icon && <Icon size={16} aria-hidden="true" />} {text}
        </button>
      ))}
    </div>
  )
}

// Popup kartu pengganti window.confirm/prompt, pakai <dialog> bawaan browser (latar gelap, Esc, fokus).
// const [dialog, el] = useDialog(); render {el}; await dialog({ title, text?, input?, type?, minLength?, ok?, danger? })
// Hasil: konfirmasi = true, isian = teks, Batal/Esc = null.
export function useDialog() {
  const [d, setD] = useState(null)
  const ref = useRef(null)
  useEffect(() => { if (d) ref.current.showModal() }, [d])
  const close = (v) => { ref.current.close(); d.resolve(v); setD(null) }
  const DialogField = d?.type === 'password' ? PasswordInput : 'input'
  const el = d && (
    <dialog ref={ref} onCancel={(e) => { e.preventDefault(); close(null) }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-lg bg-transparent p-0 backdrop:bg-gray-900/60">
      <form className={`${CARD} animate-muncul border-0 shadow-xl`} onSubmit={(e) => { e.preventDefault(); close(d.input === undefined ? true : e.currentTarget.v.value.trim() || null) }}>
        <h3 className="text-base font-semibold text-gray-900">{d.title}</h3>
        {d.text && <p className="text-sm text-gray-600">{d.text}</p>}
        {d.input !== undefined && <DialogField name="v" defaultValue={d.input} type={d.type ?? 'text'} minLength={d.minLength} required autoFocus autoComplete="off" className={INPUT} />}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => close(null)} className={BTN2}>Batal</button>
          <button className={d.danger ? BTN.replace('bg-gray-900', 'bg-red-600').replace('hover:bg-gray-700', 'hover:bg-red-700') : BTN}>{d.ok ?? 'Simpan'}</button>
        </div>
      </form>
    </dialog>
  )
  return [(opts) => new Promise((resolve) => setD({ ...opts, resolve })), el]
}

// Input password dengan ikon mata untuk melihat/menyembunyikan isinya.
export function PasswordInput({ className = INPUT, ...props }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input {...props} type={show ? 'text' : 'password'} className={`${className} pr-11`} />
      <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Sembunyikan password' : 'Lihat password'}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-gray-500 hover:text-gray-900">
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  )
}

// options: { nilai: label } atau [[nilai, label]]. Wajib = tanpa default, harus dipilih sadar.
export function Select({ label, name, options, required = true }) {
  const list = Array.isArray(options) ? options : Object.entries(options)
  return (
    <label className="block text-sm font-medium text-gray-700">
      {label}
      <select name={name} required={required} defaultValue="" className={INPUT}>
        <option value="" disabled={required}>{required ? '-- Pilih --' : '- Tidak ada -'}</option>
        {list.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
    </label>
  )
}

// Pilihan ganda. Wajib = minimal satu: kotak pertama diberi required selama belum ada yang dicentang.
export function Checks({ label, name, options, required = true }) {
  const [n, setN] = useState(0)
  return (
    <fieldset className="text-sm font-medium text-gray-700">
      <legend>{label}</legend>
      <div className="mt-1 flex flex-wrap gap-2" onChange={(e) => setN((c) => c + (e.target.checked ? 1 : -1))}>
        {Object.entries(options).map(([v, t], i) => (
          <label key={v} className="relative cursor-pointer rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-800 transition-colors hover:border-gray-900 has-[:checked]:border-gray-900 has-[:checked]:bg-gray-900 has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gray-900 has-[:focus-visible]:ring-offset-2">
            <input type="checkbox" name={`${name}[]`} value={v} required={required && i === 0 && n === 0} className="sr-only" /> {t}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

// 3 faktor poin Safety + total dan rank yang langsung terlihat. suffix '_after' untuk form After.
export function ScoreInput({ suffix = '' }) {
  const [v, setV] = useState({})
  const picked = Object.values(v)
  const total = picked.reduce((a, b) => a + b, 0)
  return (
    <div className="flex flex-col gap-4" onChange={(e) => setV({ ...v, [e.target.name]: Number(e.target.value) })}>
      <Select label="(1) Tingkat Keparahan" name={`severity${suffix}`} options={SEVERITY} />
      <Select label="(2) Frekuensi Pekerjaan" name={`frequency${suffix}`} options={FREQUENCY} />
      <Select label="(3) Tingkat Kemungkinan Potensi" name={`probability${suffix}`} options={PROBABILITY} />
      <p className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm tabular-nums text-gray-700">
        Total poin: <b>{picked.length === 3 ? total : '-'}</b> · Rank: <b>{picked.length === 3 ? rankOf(total) : '-'}</b>
        <span className="block text-xs text-gray-500">A = 19-25 · B = 10-18 · C = 6-9</span>
      </p>
    </div>
  )
}

export function PhotoInput({ label }) {
  const [preview, setPreview] = useState('')
  return (
    <label className="relative block text-sm font-medium text-gray-700">
      {label}
      <input type="file" name="photo" accept="image/*" required className="peer sr-only"
        onChange={(e) => setPreview(e.target.files[0] ? URL.createObjectURL(e.target.files[0]) : '')} />
      <div className="mt-1 flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-gray-500 transition-colors hover:border-gray-900 hover:text-gray-900 peer-focus-visible:border-gray-900 peer-focus-visible:ring-2 peer-focus-visible:ring-gray-900">
        {preview
          ? <img src={preview} alt="Pratinjau foto" className="max-h-60 rounded" />
          : <><Camera size={28} className="mb-2" aria-hidden="true" /><span className="text-sm font-semibold">Ambil Foto / Upload</span><span className="text-xs font-normal">JPG/PNG dari kamera atau galeri</span></>}
      </div>
    </label>
  )
}

// Foto privat: diambil dengan token login (photoUrl).
// Ditekan = foto ukuran penuh di tab baru; zoom memakai fitur browser.
export function SignedImg({ path, alt }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    photoUrl(path).then(setUrl, () => setUrl(''))
  }, [path])
  if (!url) return null
  return (
    <a href={url} target="_blank" rel="noreferrer" className="block">
      <img src={url} alt={alt} className="max-h-[28rem] w-full rounded-md border border-gray-200 bg-gray-100 object-contain" />
      <span className="mt-1 block text-center text-xs text-gray-500">Tekan foto untuk melihat ukuran penuh</span>
    </a>
  )
}
