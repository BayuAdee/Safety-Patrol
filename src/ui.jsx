import { useEffect, useState } from 'react'
import { Camera } from 'lucide-react'
import { supabase } from './supabase'

// Kode yang disimpan di database -> label tampilan.
export const TYPE = { safety: 'Safety', '5s': '5S' }
export const FOUR_M = { man: 'Manusia (Man)', machine: 'Mesin (Machine)', material: 'Material (Material)', method: 'Metode (Method)' }
export const STOP6 = { A: 'A: Apparatus', B: 'B: Big Heavy', C: 'C: Car/Vehicle', D: 'D: Drop/Fall', E: 'E: Electric', F: 'F: Fire', O: 'O: Other' }
export const RANK = { A: 'A', B: 'B', C: 'C' }
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

export const INPUT = 'mt-1 w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm font-normal text-gray-800 outline-none focus:ring-2 focus:ring-gray-900'
export const CARD = 'flex flex-col gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm'

// options: { nilai: label } atau [[nilai, label]]. Wajib = tanpa default, harus dipilih sadar.
export function Select({ label, name, options, required = true }) {
  const list = Array.isArray(options) ? options : Object.entries(options)
  return (
    <label className="block text-xs font-bold text-gray-500">
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
    <fieldset className="text-xs font-bold text-gray-500">
      <legend>{label}</legend>
      <div className="mt-1 flex flex-wrap gap-2" onChange={(e) => setN((c) => c + (e.target.checked ? 1 : -1))}>
        {Object.entries(options).map(([v, t], i) => (
          <label key={v} className="relative cursor-pointer rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-normal text-gray-800 has-[:checked]:border-gray-900 has-[:checked]:bg-gray-900 has-[:checked]:text-white">
            <input type="checkbox" name={`${name}[]`} value={v} required={required && i === 0 && n === 0} className="sr-only" /> {t}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function PhotoInput({ label }) {
  const [preview, setPreview] = useState('')
  return (
    <label className="relative block text-xs font-bold text-gray-500">
      {label}
      <input type="file" name="photo" accept="image/*" required className="sr-only"
        onChange={(e) => setPreview(e.target.files[0] ? URL.createObjectURL(e.target.files[0]) : '')} />
      <div className="mt-1 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-6 text-gray-500 hover:border-gray-900 hover:text-gray-900">
        {preview
          ? <img src={preview} alt="Pratinjau foto" className="max-h-60 rounded" />
          : <><Camera size={32} className="mb-2" /><span className="text-sm font-semibold">Ambil Foto / Upload</span></>}
      </div>
    </label>
  )
}

// Bucket private: tampilkan lewat signed URL (berlaku 1 jam).
// Ditekan = foto ukuran penuh di tab baru; zoom memakai fitur browser.
export function SignedImg({ path, alt }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    supabase.storage.from('attachments').createSignedUrl(path, 3600).then(({ data }) => setUrl(data?.signedUrl ?? ''))
  }, [path])
  if (!url) return null
  return (
    <a href={url} target="_blank" rel="noreferrer" className="block">
      <img src={url} alt={alt} className="w-full rounded border border-red-100" />
      <span className="mt-1 block text-center text-xs text-gray-500">Tekan foto untuk melihat ukuran penuh</span>
    </a>
  )
}
