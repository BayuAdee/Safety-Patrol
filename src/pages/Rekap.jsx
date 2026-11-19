import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { supabase } from '../supabase'
import { BULAN, minggu, rekap, semesterRange } from '../rekap'
import { CARD, INPUT, KAIZEN, STOP6, labels } from '../ui'
import { buildXlsx } from '../xlsx'

// Layar admin: tiruan sheet "Grafik 2026" (2 tabel + 4 grafik batang). RLS: admin melihat semua temuan.
const ROWS = [
  ['Minggu 1', 'm1'], ['Minggu 2', 'm2'], ['Total', 'total'],
  ['Status Open Minggu 1', 'open1'], ['Status Close Minggu 1', 'close1'],
  ['Status Open Minggu 2', 'open2'], ['Status Close Minggu 2', 'close2'],
]
const MINGGU = [['Minggu 1', 'm1', 'bg-gray-400'], ['Minggu 2', 'm2', 'bg-gray-600'], ['Total', 'total', 'bg-gray-900']]
const STATUS = [
  ['Open Minggu 1', 'open1', 'bg-red-300'], ['Close Minggu 1', 'close1', 'bg-gray-400'],
  ['Open Minggu 2', 'open2', 'bg-red-600'], ['Close Minggu 2', 'close2', 'bg-gray-900'],
]

export default function Rekap() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [sem, setSem] = useState(now.getMonth() < 6 ? 1 : 2)
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function download() {
    setBusy(true)
    setError('')
    try { await downloadExcel(year, sem) } catch (e) { setError(e.message) }
    setBusy(false)
  }

  useEffect(() => {
    const [from, to] = semesterRange(year, sem)
    setRows(null)
    supabase.from('v_findings').select('type, created_at, status')
      .gte('created_at', from.toISOString()).lt('created_at', to.toISOString())
      .then(({ data, error }) => { setRows(data ?? []); setError(error?.message ?? '') })
  }, [year, sem])

  const months = BULAN.slice(sem === 1 ? 0 : 6, sem === 1 ? 6 : 12)
  const r = rows && rekap(rows, year, sem)

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex gap-2">
        <label className="flex-1 text-xs font-bold text-gray-500">Tahun
          <input type="number" value={year} onChange={(e) => setYear(+e.target.value)} className={INPUT} />
        </label>
        <label className="flex-1 text-xs font-bold text-gray-500">Semester
          <select value={sem} onChange={(e) => setSem(+e.target.value)} className={INPUT}>
            <option value={1}>1 (Jan - Jun)</option>
            <option value={2}>2 (Jul - Des)</option>
          </select>
        </label>
      </div>

      <button onClick={download} disabled={busy} className="flex items-center justify-center gap-2 rounded-xl bg-gray-900 py-3 font-bold text-white shadow hover:bg-gray-700 disabled:opacity-50">
        <Download size={18} /> {busy ? 'Menyiapkan Excel (memuat foto)...' : 'Download Excel'}
      </button>

      <h2 className="text-center font-bold text-gray-900">
        REKAPITULASI TEMUAN SAFETY & 5S/5R PERIODE SEMESTER {sem} TAHUN {year}
      </h2>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!r ? <p className="text-center text-sm text-gray-500">Memuat...</p> : (
        <div className="grid gap-4 md:grid-cols-2">
          {[['safety', 'Safety'], ['5s', '5S/5R']].map(([k, name]) => (
            <div key={k} className="flex flex-col gap-4">
              <Table title={`Rekap Temuan ${name}`} months={months} data={r[k]} />
              <Bars title={`Rekap ${name} Minggu 1 & Minggu 2`} months={months} data={r[k]} series={MINGGU} />
              <Bars title={`Rekap ${name} Status Open & Close`} months={months} data={r[k]} series={STATUS} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ===== Export Excel: format sama dengan file patroli lama (lihat scripts/buat_template.py) =====
async function downloadExcel(year, sem) {
  const [from, to] = semesterRange(year, sem)
  const get = async (q) => { const { data, error } = await q; if (error) throw error; return data }
  const [findings, areas, depts, people, tpl] = await Promise.all([
    get(supabase.from('v_findings').select('*').gte('created_at', from.toISOString()).lt('created_at', to.toISOString()).order('created_at')),
    get(supabase.from('areas').select('id, name')),
    get(supabase.from('departments').select('id, name')),
    get(supabase.from('profiles').select('id, name')),
    fetch('/rekap-template.xlsx').then((r) => r.arrayBuffer()),
  ])
  const res = findings.length ? await get(supabase.from('resolutions').select('finding_id, photo_after').in('finding_id', findings.map((f) => f.id))) : []
  const after = Object.fromEntries(res.map((r) => [r.finding_id, r.photo_after]))
  const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x.name]))
  const [A, D, P] = [byId(areas), byId(depts), byId(people)]

  // Foto: signed URL -> diperkecil agar file tetap ringan. Foto gagal dimuat -> teks keterangan.
  // ponytail: semua foto dimuat bersamaan; batasi bila satu semester berisi ratusan temuan.
  const paths = [...findings.map((f) => f.photo_before), ...Object.values(after)]
  const { data: urls } = paths.length ? await supabase.storage.from('attachments').createSignedUrls(paths, 600) : { data: [] }
  const img = Object.fromEntries(await Promise.all((urls ?? []).map(async (u) =>
    [u.path, u.signedUrl ? await shrink(u.signedUrl).catch(() => null) : null])))
  const photo = (p) => (img[p] ? { img: img[p] } : '(foto tidak tersedia)')

  const day = (s) => s && new Date(s)
  const row = (f, i, middle) => [
    i + 1, f.code, day(f.created_at), `Minggu ${minggu(new Date(f.created_at))}`, A[f.area_id], photo(f.photo_before), f.description,
    ...['material', 'machine', 'man', 'method'].map((m) => (f.four_m.includes(m) ? '√' : '')),
    ...middle,
    P[f.created_by], D[f.target_dept_id], day(f.due_date), day(f.closed_at), after[f.id] ? photo(after[f.id]) : '', f.status === 'open' ? 'Open' : 'Close',
  ]
  const safety = findings.filter((f) => f.type === 'safety')
    .map((f, i) => row(f, i, [STOP6[f.stop6], f.rank, f.kaizen ? labels(KAIZEN, f.kaizen) : '']))
  const fiveS = findings.filter((f) => f.type === '5s')
    .map((f, i) => row(f, i, [`R${f.five_r}`, f.sqcdm.join(',')]))

  const out = buildXlsx(new Uint8Array(tpl), {
    year, safety, fiveS,
    title: `REKAPITULASI TEMUAN SAFETY & 5S/5R PERIODE SEMESTER ${sem} TAHUN ${year}`,
    period: `Semester ${sem} Tahun ${year}`,
    months: BULAN.slice(sem === 1 ? 0 : 6, sem === 1 ? 6 : 12),
    rekap: rekap(findings, year, sem),
  })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  a.download = `Rekap Safety 5S Semester ${sem} ${year}.xlsx`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

// Foto -> JPEG sisi terpanjang 640px.
async function shrink(url, max = 640) {
  const bmp = await createImageBitmap(await (await fetch(url)).blob())
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const c = Object.assign(document.createElement('canvas'), { width: Math.round(bmp.width * k), height: Math.round(bmp.height * k) })
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height)
  const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.8))
  return { bytes: new Uint8Array(await blob.arrayBuffer()), w: c.width, h: c.height }
}

function Table({ title, months, data }) {
  return (
    <div className={`${CARD} gap-2 overflow-x-auto`}>
      <h3 className="font-bold text-gray-900">{title}</h3>
      <table className="w-full text-right text-xs tabular-nums">
        <thead>
          <tr className="border-b text-gray-500"><th className="py-1 text-left">Bulan</th>{months.map((m) => <th key={m}>{m}</th>)}</tr>
        </thead>
        <tbody>
          {ROWS.map(([label, key]) => (
            <tr key={key} className={key === 'total' ? 'border-y font-bold text-gray-900' : 'text-gray-700'}>
              <td className="py-1 pr-2 text-left">{label}</td>{data[key].map((v, i) => <td key={i}>{v}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Grafik batang berkelompok (clustered column) dengan angka di atas batang, seperti di Excel.
// ponytail: CSS biasa tanpa library grafik; cukup untuk 6 bulan x 4 seri.
function Bars({ title, months, data, series }) {
  const max = Math.max(1, ...series.flatMap(([, k]) => data[k]))
  return (
    <div className={CARD}>
      <h3 className="font-bold text-gray-900">{title}</h3>
      <div className="flex flex-wrap gap-3 text-xs text-gray-600">
        {series.map(([name, , cls]) => <span key={name} className="flex items-center gap-1"><i className={`h-3 w-3 rounded-sm ${cls}`} />{name}</span>)}
      </div>
      <div className="flex h-44 items-end gap-2 border-b border-gray-300 pt-4">
        {months.map((m, i) => (
          <div key={m} className="flex h-full flex-1 items-end justify-center gap-0.5">
            {series.map(([name, k, cls]) => (
              <div key={k} title={`${m} - ${name}: ${data[k][i]}`} className="flex h-full flex-1 flex-col items-center justify-end">
                <span className="text-[10px] tabular-nums text-gray-700">{data[k][i]}</span>
                <div className={`w-full rounded-t ${cls}`} style={{ height: `${(data[k][i] / max) * 85}%` }} />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="-mt-3 flex gap-2 text-center text-xs text-gray-500">{months.map((m) => <span key={m} className="flex-1">{m}</span>)}</div>
    </div>
  )
}
