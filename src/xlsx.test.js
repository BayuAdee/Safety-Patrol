// Jalankan: node src/xlsx.test.js [keluaran.xlsx]
// Membangun Excel dari template dengan data tiruan (foto = logo di template), lalu memeriksa isinya.
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { strFromU8, unzipSync } from 'fflate'
import { rekap, rekapKategori } from './rekap.js'
import { buildXlsx } from './xlsx.js'

const tpl = readFileSync(new URL('../public/rekap-template.xlsx', import.meta.url))
const t = unzipSync(tpl)
const img = { img: { bytes: t[Object.keys(t).find((p) => /^xl\/media\/.*\.jpe?g$/.test(p))], w: 300, h: 250 } }
const d = (s) => new Date(s)
const findings = [
  { type: 'safety', created_at: '2026-07-03T02:00:00Z', status: 'closed', stop6: 'A', rank: 'A' },
  { type: 'safety', created_at: '2026-09-18T02:00:00Z', status: 'open', stop6: 'O', rank: 'C' },
  { type: '5s', created_at: '2026-07-17T02:00:00Z', status: 'open', five_r: 2, sqcdm: ['S', 'M'] },
]
const out = buildXlsx(tpl, {
  title: 'REKAPITULASI TEMUAN SAFETY & 5S/5R PERIODE Jul 2026 s.d. Sep 2026',
  period: 'Jul 2026 s.d. Sep 2026',
  months: ['Jul', 'Agu', 'Sep'],                       // 3 bulan: grafik bulanan dipendekkan
  rekap: rekap(findings, new Date(2026, 6, 1), 3),
  kategori: rekapKategori(findings),
  weeks: [{ name: 'Safety Week 1 3 Jul 2026', type: 'safety', rows: [
    [1, 'TRF-001', d('2026-07-03'), 'Ruang Panel', img, 'Kabel <panel> & "terkelupas"', '', '√', '', '', 'E: Electric', 21, 'A', 'Modifikasi', '1. Yudha\n2. Alex', 'Maintenance', 'Pasang cover', 'Budi', d('2026-07-10'), d('2026-07-07'), img, 8, 'C', 'Close'],
    [2, 'TRF-002', d('2026-09-18'), 'Lorong', '(foto tidak ada)', 'Oli bocor', '', '√', '', '', 'D: Drop/Fall', 15, 'B', '', 'Eko', 'Engineering', 'Lap oli', '', null, null, '', '', '', 'Open'],
  ] }, { name: '5S Week 2 17 Jul 2026', type: '5s', rows: [
    [1, 'TRF-003', d('2026-07-17'), 'Gudang', img, 'Kardus', '√', '', '', '√', 'R2', 'S,M', 'Citra', 'Produksi', 'Rapikan', '', null, null, '', 'Open'],
  ] }],
})

const f = unzipSync(out)
const s = (p) => strFromU8(f[p])
const num = (sheet, ref, v) => assert.match(s(sheet), new RegExp(`<c r="${ref}"[^>]*><v>${v}</v></c>`), ref)
const str = (sheet, ref, v) => assert.match(s(sheet), new RegExp(`<c r="${ref}"[^>]*t="inlineStr"><is><t xml:space="preserve">${v}</t>`), ref)
const S1 = 'xl/worksheets/sheet1.xml', S2 = 'xl/worksheets/sheet2.xml', S3 = 'xl/worksheets/sheet3.xml', S4 = 'xl/worksheets/sheet4.xml'

// Grafik Bulanan: Safety baris 5.., 5S baris 21..; kolom B Minggu 1, C Minggu 2, D Total, E..H Open/Close.
str(S1, 'B2', 'PT YAHATA FASTENER INDONESIA  \\|  Jul 2026 s.d. Sep 2026')
str(S1, 'A5', 'Jul'); str(S1, 'A7', 'Sep')
num(S1, 'B5', 1); num(S1, 'F5', 1)                       // Jul Safety Minggu 1, Close Minggu 1
num(S1, 'C7', 1); num(S1, 'G7', 1)                       // Sep Safety Minggu 2, Open Minggu 2
num(S1, 'C21', 1); num(S1, 'G21', 1)                     // Jul 5S Minggu 2, Open Minggu 2
assert.match(s(S1), /<c r="A8" s="\d+"\/>/)              // bulan ke-4 dst dikosongkan
assert.match(s(S1), /<c r="B8" s="\d+"\/>/)
const charts = Object.keys(f).filter((p) => /^xl\/charts\/chart\d+\.xml$/.test(p))
assert.equal(charts.length, 16)
const bul = charts.map(s).filter((x) => x.includes("'Grafik Bulanan'!"))
assert.equal(bul.length, 4)
assert.ok(bul.every((x) => !/\$(16|32)(?!\d)/.test(x)))
assert.ok(bul.some((x) => x.includes("'Grafik Bulanan'!$B$5:$B$7")) && bul.some((x) => x.includes("'Grafik Bulanan'!$B$21:$B$23")))

// Grafik Kategori: B5:H9 = 5R, B13:E20 = STOP-6 x Rank.
str(S2, 'B2', 'PT YAHATA FASTENER INDONESIA  \\|  Jul 2026 s.d. Sep 2026')
num(S2, 'B6', 1); num(S2, 'C6', 1); num(S2, 'D6', 1); num(S2, 'H6', 1); num(S2, 'E6', 0)   // R2: Before, Sisa, S, M
num(S2, 'B13', 2); num(S2, 'C13', 1); num(S2, 'E13', 1); num(S2, 'C14', 1); num(S2, 'E20', 1)
assert.ok(charts.map(s).some((x) => x.includes("'Grafik Kategori'!$B$5:$B$9")))

// SAFETY & 5S
assert.match(s(S3), /Kabel &lt;panel&gt; &amp; "terkelupas"/)
str(S3, 'O6', '1\\. Yudha\\n2\\. Alex')                    // auditor bernomor, satu nama per baris
num(S3, 'L6', 21); str(S3, 'Q6', 'Pasang cover'); str(S3, 'R6', 'Budi'); num(S3, 'V6', 8); str(S3, 'W6', 'C'); str(S3, 'X7', 'Open')
assert.doesNotMatch(s(S3), /<row r="8"/)
str(S4, 'K6', 'R2'); str(S4, 'O6', 'Rapikan')
// Header (dari template): KAIZEN tepat sebelum PIC PERBAIKAN; 5S: KATEGORI, EFFECT di atas S,Q,C,D,M
const head = (sheet, ref, v) => assert.match(s(sheet), new RegExp(`<c r="${ref}"[^>]*><is><t>${v}</t>`), ref)
head(S3, 'F4', 'TEMUAN/PROBLEM'); head(S3, 'N4', 'KAIZEN CATEGORY'); head(S3, 'Q4', 'KAIZEN'); head(S3, 'R4', 'PIC PERBAIKAN')
head(S4, 'F4', 'TEMUAN/PROBLEM'); head(S4, 'K4', 'KATEGORI'); head(S4, 'L4', 'EFFECT'); head(S4, 'L5', 'S,Q,C,D,M')
head(S4, 'O4', 'KAIZEN'); head(S4, 'P4', 'PIC PERBAIKAN')
// Satu tab per patroli; sheet SAFETY/5S template dibuang
const wb = s('xl/workbook.xml')
assert.match(wb, /<sheet name="Grafik Kategori"[^>]*\/><sheet name="Safety Week 1 3 Jul 2026" sheetId="3" r:id="rIdS3"\/><sheet name="5S Week 2 17 Jul 2026" sheetId="4" r:id="rIdS4"\/><\/sheets>/)
assert.match(wb, /localSheetId="2">'Safety Week 1 3 Jul 2026'!\$4:\$5</)
assert.match(s('xl/_rels/workbook.xml.rels'), /Id="rIdS4"[^>]*Target="\/xl\/worksheets\/sheet4.xml"/)
assert.equal((s('[Content_Types].xml').match(/worksheets\/sheet4.xml/g) || []).length, 1)
assert.match(s('xl/worksheets/_rels/sheet3.xml.rels'), /drawing3.xml/)
assert.equal(Object.keys(f).filter((p) => p.startsWith('xl/media/foto')).length, 3)
assert.match(s('[Content_Types].xml'), /<Default Extension="jpg" ContentType="image\/jpeg"\/>/)   // tanpa ini Excel minta "recover"
assert.equal(Object.keys(f).filter((p) => p.endsWith('.png')).length, 0)                 // placeholder dibuang
if (process.argv[2]) writeFileSync(process.argv[2], out)
console.log('xlsx OK')
