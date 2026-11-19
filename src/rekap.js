// Perhitungan sheet "Grafik 2026": per jenis, per bulan dalam satu semester, per minggu patroli.
// Patroli tiap Jumat 2 minggu sekali: patroli ke-1 jatuh di tgl 1-14, ke-2 di tgl 15-28.
// ponytail: minggu ditebak dari tanggal temuan (created_at, waktu lokal). Bulan dengan 3 patroli
// (tgl 29-31) ikut Minggu 2; pakai tabel jadwal bila patroli sering bergeser.
export const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

export const minggu = (d) => (d.getDate() <= 14 ? 1 : 2)

export const semesterRange = (year, sem) => [new Date(year, sem === 1 ? 0 : 6, 1), new Date(year, sem === 1 ? 6 : 12, 1)]

// rows: [{ type, created_at, status }] -> { safety: {m1, m2, total, open1, close1, open2, close2}, '5s': {...} }
// Tiap nilai = array 6 angka (bulan ke-1..6 dalam semester).
export function rekap(rows, year, sem) {
  const zero = () => Array(6).fill(0)
  const make = () => ({ m1: zero(), m2: zero(), total: zero(), open1: zero(), close1: zero(), open2: zero(), close2: zero() })
  const out = { safety: make(), '5s': make() }
  const [from, to] = semesterRange(year, sem)
  for (const r of rows) {
    const d = new Date(r.created_at)
    if (d < from || d >= to || !out[r.type]) continue
    const t = out[r.type], i = d.getMonth() % 6, w = minggu(d)
    t[`m${w}`][i]++
    t.total[i]++
    t[`${r.status === 'open' ? 'open' : 'close'}${w}`][i]++
  }
  return out
}
