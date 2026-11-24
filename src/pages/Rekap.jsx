import { useEffect, useState } from 'react'
import { BarChart3, CheckCircle, ClipboardList, Download, PieChart, ShieldAlert, Sparkles, TriangleAlert } from 'lucide-react'
import { api, photoUrl, toJpeg } from '../api'
import { BULAN, R5, RANK, S6, SQ, minggu, rekap, rekapDeptRank, rekapKategori } from '../rekap'
import { BTN, CARD, CARD_TITLE, FIVE_R, INPUT, KAIZEN, STOP6, Skeleton, TYPE, labels } from '../ui'
import { buildXlsx } from '../xlsx'

// Layar admin (admin & superadmin melihat semua temuan): satu layar Rekap & Grafik, rentang bebas 1-12 bulan.
// Semua grafik juga ada di Download Excel, kecuali per departemen dan Rank Before/After (daftar departemen bisa berubah).
const ROWS = [
  ['Minggu 1', 'm1'], ['Minggu 2', 'm2'], ['Total', 'total'],
  ['Status Open Minggu 1', 'open1'], ['Status Close Minggu 1', 'close1'],
  ['Status Open Minggu 2', 'open2'], ['Status Close Minggu 2', 'close2'],
]
const range = (from, to) => `/findings?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`
// Warna grafik (khusus grafik; bingkai aplikasi tetap monokrom). Palet kategori dataviz, dicek buta warna dengan
// validate_palette.js (light). Open = warna hangat, Close = warna dingin. Angka di atas batang + legenda + tabel
// = penanda kedua, jadi warna tidak berdiri sendiri. Warna mengikuti kategori (S selalu biru, dst.), bukan urutan.
const C = { blue: '#2a78d6', orange: '#eb6834', aqua: '#1baf7a', yellow: '#eda100', magenta: '#e87ba4', green: '#008300', violet: '#6250d6', red: '#e34948', gray: '#4b5563' }
const MINGGU = [['Minggu 1', 'm1', C.blue], ['Minggu 2', 'm2', C.orange], ['Total', 'total', C.violet]]
const STATUS = [
  ['Open Minggu 1', 'open1', C.orange], ['Close Minggu 1', 'close1', C.blue],
  ['Open Minggu 2', 'open2', C.red], ['Close Minggu 2', 'close2', C.aqua],
]
const OPEN_CLOSE = [['Open', 'open', C.red], ['Close', 'close', C.blue]]
const BEFORE_AFTER = [['Before', 'before', C.orange], ['After', 'after', C.aqua]]
const TARGET = [['Before', 'before', C.blue], ['Sisa (Open)', 'open', C.red]]
const SQ_C = [C.blue, C.orange, C.aqua, C.yellow, C.magenta]                                // S Q C D M
const S6_C = [C.gray, C.blue, C.orange, C.aqua, C.yellow, C.magenta, C.green, C.violet]      // Total, A..F, O
const RANK_C = [C.gray, C.red, C.yellow, C.aqua]                                              // Total, A, B, C
const one = (cls) => [['Jumlah', 'n', cls]]
const ALERT = 'rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'
// "yudha" -> "Yudha" (nama auditor diketik bebas di form).
const cap = (s) => s.replace(/(^|\s)\S/g, (x) => x.toUpperCase())
const ym = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

export default function Rekap() {
  const now = new Date()
  const [from, setFrom] = useState(`${now.getFullYear()}-01`)
  const [to, setTo] = useState(ym(now))
  const [data, setData] = useState(null) // { rows, master }
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [fy, fm] = from.split('-').map(Number)
  const [ty, tm] = to.split('-').map(Number)
  const n = (ty - fy) * 12 + tm - fm + 1
  const valid = n >= 1 && n <= 12                         // NaN (isian kosong) juga tidak sah
  const start = new Date(fy, fm - 1, 1)
  const months = valid ? Array.from({ length: n }, (_, i) => {
    const d = new Date(fy, fm - 1 + i, 1)
    return BULAN[d.getMonth()] + (fy !== ty ? ` ${String(d.getFullYear()).slice(2)}` : '')   // lintas tahun: "Nov 26"
  }) : []
  const period = n === 1 ? `${BULAN[fm - 1]} ${fy}` : `${BULAN[fm - 1]} ${fy} s.d. ${BULAN[tm - 1]} ${ty}`
  const title = `REKAPITULASI TEMUAN SAFETY & 5S/5R PERIODE ${period.toUpperCase()}`

  useEffect(() => {
    if (!valid) return
    setData(null)
    Promise.all([api(range(start, new Date(ty, tm, 1))), api('/master')])
      .then(([rows, master]) => { setData({ rows, master }); setError('') }, (e) => setError(e.message))
  }, [from, to]) // eslint-disable-line react-hooks/exhaustive-deps

  const r = data && rekap(data.rows, start, n)
  const dr = data && rekapDeptRank(data.rows)
  const k = data && rekapKategori(data.rows)

  async function download() {
    setBusy(true)
    setError('')
    try { await downloadExcel(data, `Rekap Safety 5S ${period}.xlsx`, { title, period, months, rekap: r, kategori: k }) } catch (e) { setError(e.message) }
    setBusy(false)
  }

  const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x.name]))
  const [P, D] = data ? [byId(data.master.profiles), byId(data.master.departments)] : [{}, {}]
  const open = data?.rows.filter((f) => f.status === 'open').length
  const total = data?.rows.length ?? 0
  const stats = [['Total Temuan', total, ClipboardList], ['Open', open, TriangleAlert, 'text-red-600'], ['Close', total - open, CheckCircle],
    ['Tingkat Penyelesaian', total ? `${Math.round(((total - open) / total) * 100)}%` : '-', PieChart]]
  const R = R5.map((x) => FIVE_R[x].split(':')[0])
  const S6X = ['Total', ...S6]

  return (
    <div className="flex flex-col gap-4 p-4 pb-8">
      <div className={`${CARD} gap-3 sm:flex-row sm:flex-wrap sm:items-end`}>
        <label className="text-sm font-medium text-gray-700 sm:w-52">Dari bulan
          <input type="month" value={from} onChange={(e) => setFrom(e.target.value)} className={INPUT} />
        </label>
        <label className="text-sm font-medium text-gray-700 sm:w-52">Sampai bulan
          <input type="month" value={to} min={from} onChange={(e) => setTo(e.target.value)} className={INPUT} />
        </label>
        <p className="text-xs text-gray-500 sm:mb-3 sm:flex-1">Rentang 1-12 bulan, boleh lintas tahun.</p>
        <button onClick={download} disabled={busy || !data || !valid} className={BTN}>
          <Download size={18} aria-hidden="true" /> {busy ? 'Menyiapkan Excel (memuat foto)...' : 'Download Excel'}
        </button>
      </div>
      {!valid && <p role="alert" className={ALERT}>Pilih rentang 1 sampai 12 bulan; &quot;Sampai bulan&quot; tidak boleh sebelum &quot;Dari bulan&quot;.</p>}
      {error && <p role="alert" className={ALERT}>{error}</p>}
      {valid && (!data ? !error && <Skeleton n={6} h="h-40" className="grid gap-4 md:grid-cols-2" /> : (
        <>
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-500">{title}</p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {stats.map(([label, value, Icon, cls = 'text-gray-950']) => (
              <div key={label} className="rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
                <div className="flex items-start justify-between gap-2"><p className="text-sm font-medium text-gray-500">{label}</p><Icon size={18} aria-hidden="true" className="shrink-0 text-gray-400" /></div>
                <p className={`mt-2 text-3xl font-bold tabular-nums ${cls}`}>{value}</p>
              </div>
            ))}
          </div>

          <Section icon={BarChart3} title="Rekap per Bulan" sub="Patroli 2 minggu sekali: tgl 1-14 = Minggu 1, tgl 15-31 = Minggu 2" />
          <div className={n > 6 ? 'grid gap-4' : 'grid gap-4 md:grid-cols-2'}>
            {[['safety', 'Safety'], ['5s', '5S/5R']].map(([key, name]) => (
              <div key={key} className="flex flex-col gap-4">
                <Table title={`Rekap Temuan ${name}`} months={months} data={r[key]} />
                <Bars title={`Rekap ${name} Minggu 1 & Minggu 2`} months={months} data={r[key]} series={MINGGU} />
                <Bars title={`Rekap ${name} Status Open & Close`} months={months} data={r[key]} series={STATUS} />
              </div>
            ))}
          </div>

          <Section icon={ClipboardList} title="Per Departemen & Rank" sub="Departemen tujuan (PIC) dan perubahan Rank Safety setelah perbaikan" />
          <div className="grid gap-4 md:grid-cols-2">
            <Bars title="Per Departemen Tujuan" months={dr.depts.map((d) => D[d])} data={dr.dept} series={OPEN_CLOSE} />
            <Bars title="Rank Safety: Before & After" months={['Rank A', 'Rank B', 'Rank C']} data={dr.rank} series={BEFORE_AFTER} />
          </div>

          <Section icon={Sparkles} title="Grafik Temuan 5S/5R" sub="Satu temuan bisa dihitung di beberapa SQCDM" />
          <div className="grid gap-4 md:grid-cols-2">
            <Bars title="Berdasarkan Kategori" months={R} data={{ n: k.fiveR.before }} series={one(C.violet)} />
            <Bars title="Target Perbaikan (sasaran Sisa = 0)" months={R} data={k.fiveR} series={TARGET} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {R5.map((x, i) => <Bars key={x} title={`${FIVE_R[x]} per S, Q, C, D, M`} months={SQ} data={{ n: k.sqcdm[i] }} series={one(SQ_C)} />)}
          </div>

          <Section icon={ShieldAlert} title="Grafik Temuan Safety" sub="Kategori STOP-6 dan Rank (A = 19-25, B = 10-18, C = 6-9 poin)" />
          <div className="grid gap-4 md:grid-cols-2">
            <Bars title="Berdasarkan STOP-6" months={S6X} data={{ n: k.stop6 }} series={one(S6_C)} />
            <Bars title="Berdasarkan Rank" months={['Total', ...RANK]} data={{ n: k.rank }} series={one(RANK_C)} />
            {RANK.map((x, i) => <Bars key={x} title={`Rank ${x} berdasarkan STOP-6`} months={S6X} data={{ n: k.rankStop6[i] }} series={one(S6_C)} />)}
          </div>

          <Daftar rows={data.rows} P={P} D={D} />
        </>
      ))}
    </div>
  )
}

function Daftar({ rows, P, D }) {
  const tgl = (s) => (s ? new Date(s).toLocaleDateString('id-ID') : '-')
  return (
    <div className={`${CARD} gap-2 overflow-x-auto`}>
      <h3 className={CARD_TITLE}>Daftar Temuan ({rows.length})</h3>
      <table className="w-full text-left text-xs tabular-nums [&_td]:px-3 [&_td]:py-2 [&_th]:px-3">
        <thead className="bg-gray-50 text-gray-600">
          <tr>{['Kode', 'Tanggal', 'Jenis', 'Area', 'Rank', 'Auditor', 'PIC', 'Diperbaiki oleh', 'Status'].map((h) => <th key={h} className="whitespace-nowrap py-2 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-gray-700">
          {rows.map((f) => (
            <tr key={f.id} className="hover:bg-gray-50">
              <td className="font-mono">{f.code}</td>
              <td>{tgl(f.created_at)}</td>
              <td>{TYPE[f.type]}</td>
              <td>{f.areas?.name}</td>
              <td className="whitespace-nowrap">{f.rank ? `${f.rank} → ${f.rank_after ?? '-'}` : '-'}</td>
              <td>{f.auditors?.map(cap).join(', ') ?? P[f.created_by]}</td>
              <td>{D[f.target_dept_id]}</td>
              <td>{P[f.closed_by] ?? '-'}</td>
              <td className="whitespace-nowrap">{f.status === 'open'
                ? <span className="rounded bg-red-50 px-2 py-0.5 font-semibold text-red-700 ring-1 ring-red-200">Open</span>
                : <span className="rounded bg-gray-100 px-2 py-0.5 font-medium text-gray-700 ring-1 ring-gray-300">Close {tgl(f.closed_at)}</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="text-center text-sm text-gray-500">Tidak ada temuan di periode ini.</p>}
    </div>
  )
}

// ===== Export Excel (template: scripts/buat_template.py). Memakai data yang sudah tampil di layar. =====
// sheets = { title, period, months, rekap, kategori } untuk sheet Grafik Bulanan & Grafik Kategori.
async function downloadExcel({ rows: findings, master }, fileName, sheets) {
  const tpl = await fetch('/rekap-template.xlsx').then((r) => r.arrayBuffer())
  const after = Object.fromEntries(findings.filter((f) => f.photo_after).map((f) => [f.id, f.photo_after]))
  const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x.name]))
  const [A, D, P] = [byId(master.areas), byId(master.departments), byId(master.profiles)]

  // Foto diperkecil agar file tetap ringan. Foto gagal dimuat -> teks keterangan.
  // ponytail: semua foto dimuat bersamaan; batasi bila satu periode berisi ratusan temuan.
  const paths = [...new Set([...findings.map((f) => f.photo_before), ...Object.values(after)])]
  const img = Object.fromEntries(await Promise.all(paths.map(async (p) =>
    [p, await photoUrl(p).then((u) => shrink(u).finally(() => URL.revokeObjectURL(u))).catch(() => null)])))
  const photo = (p) => (img[p] ? { img: img[p] } : '(foto tidak tersedia)')

  const day = (s) => s && new Date(s)
  const row = (f, i, middle, afterExtra = []) => [
    i + 1, f.code, day(f.created_at), `Minggu ${minggu(new Date(f.created_at))}`, A[f.area_id], photo(f.photo_before), f.description,
    ...['material', 'machine', 'man', 'method'].map((m) => (f.four_m.includes(m) ? '√' : '')),
    ...middle,
    f.auditors ? f.auditors.map((n, k) => `${k + 1}. ${cap(n)}`).join('\n') : P[f.created_by], D[f.target_dept_id], P[f.closed_by] ?? '', day(f.due_date), day(f.closed_at), after[f.id] ? photo(after[f.id]) : '', ...afterExtra, f.status === 'open' ? 'Open' : 'Close',
  ]
  const safety = findings.filter((f) => f.type === 'safety')
    .map((f, i) => row(f, i, [STOP6[f.stop6], f.score, f.rank, f.kaizen ? labels(KAIZEN, f.kaizen) : ''], [f.score_after ?? '', f.rank_after ?? '']))
  const fiveS = findings.filter((f) => f.type === '5s')
    .map((f, i) => row(f, i, [`R${f.five_r}`, f.sqcdm.join(',')]))

  const out = buildXlsx(new Uint8Array(tpl), { safety, fiveS, ...sheets })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  a.download = fileName
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

// Foto -> JPEG sisi terpanjang 640px.
async function shrink(url) {
  const { blob, w, h } = await toJpeg(await (await fetch(url)).blob(), 640, 0.8)
  return { bytes: new Uint8Array(await blob.arrayBuffer()), w, h }
}

function Table({ title, months, data }) {
  return (
    <div className={`${CARD} gap-2 overflow-x-auto`}>
      <h3 className={CARD_TITLE}>{title}</h3>
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

function Section({ icon: Icon, title, sub }) {
  return (
    <div className="mt-2 flex items-center gap-3 border-b border-gray-200 pb-2">
      <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gray-950 text-white"><Icon size={18} /></span>
      <div><h2 className="text-lg font-bold tracking-tight text-gray-950">{title}</h2><p className="text-xs text-gray-500">{sub}</p></div>
    </div>
  )
}

// Grafik batang berkelompok (clustered column) dengan angka di atas batang, seperti di Excel.
// series: [[nama, kunci, warna]]; warna = hex untuk seluruh seri, atau array hex per kategori (grafik satu seri).
// ponytail: CSS biasa tanpa library grafik; cukup untuk 12 bulan x 4 seri.
function Bars({ title, months, data, series }) {
  const max = Math.max(1, ...series.flatMap(([, k]) => data[k]))
  const dense = months.length * series.length > 12 // grafik padat: label 0 disembunyikan (nilai tetap di tooltip & tabel)
  return (
    <div className={CARD}>
      <h3 className={CARD_TITLE}>{title}</h3>
      {series.length > 1 && <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
        {series.map(([name, , color]) => <span key={name} className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />{name}</span>)}
      </div>}
      {/* Garis bantu tipis tiap 25%, batang membulat di ujung atas, jarak 2px antar batang. */}
      <div className="flex h-48 items-end gap-2 border-b border-gray-300 bg-[linear-gradient(to_top,#e5e7eb_1px,transparent_1px)] bg-[length:100%_25%] pt-5">
        {months.map((m, i) => (
          <div key={m} className="flex h-full flex-1 items-end justify-center gap-0.5">
            {series.map(([name, k, color]) => (
              <div key={k} title={`${m} - ${name}: ${data[k][i]}`} className="flex h-full max-w-12 flex-1 flex-col items-center justify-end">
                <span className="text-[11px] font-medium tabular-nums text-gray-700">{dense && !data[k][i] ? '' : data[k][i]}</span>
                <div className="w-full rounded-t" style={{ height: `${(data[k][i] / max) * 85}%`, background: Array.isArray(color) ? color[i] : color }} />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="-mt-3 flex gap-2 text-center text-xs text-gray-500">{months.map((m) => <span key={m} className="flex-1">{m}</span>)}</div>
    </div>
  )
}
