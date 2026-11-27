// Perhitungan layar Rekap & Grafik dan sheet Excel: per jenis, per bulan, per minggu patroli.
// Patroli tiap Jumat 2 minggu sekali: patroli ke-1 jatuh di tgl 1-14, ke-2 di tgl 15-28.
// ponytail: minggu ditebak dari tanggal temuan (created_at, waktu lokal). Bulan dengan 3 patroli
// (tgl 29-31) ikut Minggu 2; pakai tabel jadwal bila patroli sering bergeser.
export const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

export const minggu = (d) => (d.getDate() <= 14 ? 1 : 2)

// Rekap per departemen tujuan dan Rank Safety (rows sudah difilter API). Tiap seri = array sejajar kategori grafik.
// -> { depts: [id..], dept: {open, close}, rank: {before:[A,B,C], after:[A,B,C]} }
export function rekapDeptRank(rows) {
  const open = (r) => r.status === 'open'
  const count = (pred) => rows.filter(pred).length
  // Departemen yang punya temuan saja, paling banyak Open di depan.
  const depts = [...new Set(rows.map((r) => r.target_dept_id))]
  const dOpen = (d) => count((r) => r.target_dept_id === d && open(r))
  depts.sort((a, b) => dOpen(b) - dOpen(a))
  const safety = rows.filter((r) => r.type === 'safety')
  const ranks = (key) => ['A', 'B', 'C'].map((k) => safety.filter((r) => r[key] === k).length)
  return {
    depts,
    dept: { open: depts.map(dOpen), close: depts.map((d) => count((r) => r.target_dept_id === d && !open(r))) },
    rank: { before: ranks('rank'), after: ranks('rank_after') },
  }
}

// rows: [{ type, created_at, status }], from = tanggal 1 bulan pertama, n = jumlah bulan (1-12).
// -> { safety: {m1, m2, total, open1, close1, open2, close2}, '5s': {...} }, tiap nilai = array n angka (per bulan).
export function rekap(rows, from, n) {
  const zero = () => Array(n).fill(0)
  const make = () => ({ m1: zero(), m2: zero(), total: zero(), open1: zero(), close1: zero(), open2: zero(), close2: zero() })
  const out = { safety: make(), '5s': make() }
  for (const r of rows) {
    const d = new Date(r.created_at)
    const i = (d.getFullYear() - from.getFullYear()) * 12 + d.getMonth() - from.getMonth()
    if (i < 0 || i >= n || !out[r.type]) continue
    const t = out[r.type], w = minggu(d)
    t[`m${w}`][i]++
    t.total[i]++
    t[`${r.status === 'open' ? 'open' : 'close'}${w}`][i]++
  }
  return out
}

// Grafik Kategori (rentang bebas 1-4 bulan, rows sudah difilter API). Tiap seri = array sejajar kategori grafik.
// ponytail: satu temuan 5S bisa punya beberapa SQCDM, jadi jumlah S/Q/C/D/M per R boleh melebihi jumlah temuan.
export const R5 = ['1', '2', '3', '4', '5'], SQ = ['S', 'Q', 'C', 'D', 'M'], S6 = ['A', 'B', 'C', 'D', 'E', 'F', 'O'], RANK = ['A', 'B', 'C']
export function rekapKategori(rows) {
  const n = (list, pred) => list.filter(pred).length
  const safety = rows.filter((r) => r.type === 'safety')
  const s5 = rows.filter((r) => r.type === '5s')
  const perR = R5.map((k) => s5.filter((r) => String(r.five_r) === k))
  const stop6 = (list) => [list.length, ...S6.map((k) => n(list, (r) => r.stop6 === k))] // [Total, A..F, O]
  return {
    fiveR: { before: perR.map((l) => l.length), open: perR.map((l) => n(l, (r) => r.status === 'open')) },
    sqcdm: perR.map((l) => SQ.map((q) => n(l, (r) => r.sqcdm?.includes(q)))),
    stop6: stop6(safety),
    rank: [safety.length, ...RANK.map((k) => n(safety, (r) => r.rank === k))], // [Total, A, B, C]
    rankStop6: RANK.map((k) => stop6(safety.filter((r) => r.rank === k))),
  }
}

// Excel: satu sheet per patroli per jenis, urut tanggal (Safety dulu, lalu 5S, di minggu yang sama).
// Nama tab = "Safety Week 1 13,14 Nov 2026" (semua tanggal temuan minggu itu); Excel membatasi 31 karakter -> "1-14".
export function perWeek(list) {
  const key = (f) => { const d = new Date(f.created_at); return `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}-${minggu(d)}-${f.type === 'safety' ? 0 : 1}` }
  const groups = {}
  for (const f of [...list].sort((a, b) => key(a).localeCompare(key(b)) || new Date(a.created_at) - new Date(b.created_at)))
    (groups[key(f)] ??= []).push(f)                      // kunci bukan angka: urutan sisip terjaga
  return Object.values(groups).map((fs) => {
    const d = new Date(fs[0].created_at), days = [...new Set(fs.map((f) => new Date(f.created_at).getDate()))]
    const name = (ds) => `${fs[0].type === 'safety' ? 'Safety' : '5S'} Week ${minggu(d)} ${ds} ${BULAN[d.getMonth()]} ${d.getFullYear()}`
    const long = name(days.join(','))
    return { name: long.length > 31 ? name(`${days[0]}-${days.at(-1)}`) : long, type: fs[0].type, fs }
  })
}
