// Jalankan: node src/xlsx.test.js [keluaran.xlsx]
// Membangun Excel dari template dengan data tiruan (foto = logo K3 di template), lalu memeriksa isinya.
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { strFromU8, unzipSync } from 'fflate'
import { rekap } from './rekap.js'
import { buildXlsx } from './xlsx.js'

const tpl = readFileSync(new URL('../public/rekap-template.xlsx', import.meta.url))
const img = { img: { bytes: unzipSync(tpl)['xl/media/k3.jpg'], w: 300, h: 250 } }
const d = (s) => new Date(s)
const findings = [
  { type: 'safety', created_at: '2026-07-03T02:00:00Z', status: 'closed' },
  { type: 'safety', created_at: '2026-11-06T02:00:00Z', status: 'open' },
  { type: '5s', created_at: '2026-07-17T02:00:00Z', status: 'closed' },
]
const out = buildXlsx(tpl, {
  year: 2027, // nama sheet harus ikut berubah
  title: 'REKAPITULASI TEMUAN SAFETY & 5S/5R PERIODE SEMESTER 2 TAHUN 2026',
  period: 'Semester 2 Tahun 2026',
  months: ['Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
  rekap: rekap(findings, 2026, 2),
  safety: [
    [1, 'TRF-001', d('2026-07-03'), 'Minggu 1', 'Ruang Panel', img, 'Kabel <panel> & "terkelupas"', '', '√', '', '', 'E: Electric', 'A', 'Modifikasi', 'Andi', 'Maintenance', d('2026-07-10'), d('2026-07-07'), img, 'Close'],
    [2, 'TRF-002', d('2026-11-06'), 'Minggu 1', 'Lorong', '(foto tidak ada)', 'Oli bocor', '', '√', '', '', 'D: Drop/Fall', 'B', '', 'Eko', 'Engineering', null, null, '', 'Open'],
  ],
  fiveS: [
    [1, 'TRF-003', d('2026-07-17'), 'Minggu 2', 'Gudang', img, 'Kardus', '√', '', '', '√', 'R1', 'S,Q', 'Citra', 'Produksi', null, d('2026-07-19'), img, 'Close'],
  ],
})

const f = unzipSync(out)
const s = (p) => strFromU8(f[p])
assert.match(s('xl/workbook.xml'), /name="Grafik 2027"/)
assert.match(s('xl/charts/grafik1.xml'), /'Grafik 2027'!\$C\$12/)
assert.match(s('xl/worksheets/sheet1.xml'), /<c r="C12" s="\d+"><v>1<\/v><\/c>/)        // Jul Minggu 1 Safety
assert.match(s('xl/worksheets/sheet1.xml'), /<c r="G15" s="\d+"><v>1<\/v><\/c>/)        // Nov Open Minggu 1 Safety
assert.match(s('xl/worksheets/sheet1.xml'), /<c r="K13" s="\d+"><v>1<\/v><\/c>/)        // Jul Minggu 2 5S
assert.match(s('xl/worksheets/sheet2.xml'), /Kabel &lt;panel&gt; &amp; "terkelupas"/)
assert.match(s('xl/worksheets/sheet2.xml'), /<row r="7"/)
assert.doesNotMatch(s('xl/worksheets/sheet2.xml'), /<row r="8"/)
assert.equal(Object.keys(f).filter((p) => p.startsWith('xl/media/foto')).length, 4)
assert.equal(Object.keys(f).filter((p) => p.endsWith('.png')).length, 0)                 // placeholder dibuang
assert.equal((s('xl/drawings/drawing1.xml').match(/<xdr:pic>/g) || []).length, 2)
if (process.argv[2]) writeFileSync(process.argv[2], out)
console.log('xlsx OK')
