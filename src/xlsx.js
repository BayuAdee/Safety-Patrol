import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'

// Mengisi public/rekap-template.xlsx (dibuat scripts/buat_template.py) lalu mengembalikan file .xlsx.
// Template: sheet1 = "Grafik 2026" (4 grafik membaca sel C11:P18), sheet2 = SAFETY, sheet3 = 5S.
// ponytail: tulis XML langsung; library Excel umum (SheetJS/ExcelJS) membuang grafik template.

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const colName = (i) => (i >= 26 ? colName(Math.floor(i / 26) - 1) : '') + String.fromCharCode(65 + (i % 26))
const serial = (d) => (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(1899, 11, 30)) / 864e5

function cell(ref, s, v) {
  const st = s ? ` s="${s}"` : ''
  if (v == null || v === '' || typeof v === 'object' && !(v instanceof Date)) return `<c r="${ref}"${st}/>`
  if (typeof v === 'number') return `<c r="${ref}"${st}><v>${v}</v></c>`
  if (v instanceof Date) return `<c r="${ref}"${st}><v>${serial(v)}</v></c>`
  return `<c r="${ref}"${st} t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`
}

// Ganti isi sel yang sudah ada di template; gaya (s) dipertahankan.
const setCell = (xml, ref, v) =>
  xml.replace(new RegExp(`<c r="${ref}"(?: s="(\\d+)")?[^>]*?(?:/>|>.*?</c>)`), (_, s) => cell(ref, s, v))

const GRAFIK_ROWS = ['m1', 'm2', 'total', 'open1', 'close1', 'open2', 'close2'] // baris 12..18

function grafik(xml, { title, months, rekap }) {
  xml = setCell(xml, 'B7', title)
  for (const [type, c0] of [['safety', 2], ['5s', 10]]) {   // Safety C..H, 5S K..P
    months.forEach((m, i) => {
      xml = setCell(xml, `${colName(c0 + i)}11`, m)
      GRAFIK_ROWS.forEach((k, r) => { xml = setCell(xml, `${colName(c0 + i)}${12 + r}`, rekap[type][k][i]) })
    })
  }
  return xml
}

// Foto masuk ke kotak sel (kolom lebar 26 ~ 187px, baris 100pt ~ 133px), rasio dijaga, di tengah.
const BOX_W = 187, BOX_H = 133, PAD = 6, EMU = 9525
function anchor(id, col, row, { w, h }) {
  const k = Math.min((BOX_W - 2 * PAD) / w, (BOX_H - 2 * PAD) / h)
  const cw = Math.round(w * k), ch = Math.round(h * k)
  const [cx, cy, ox, oy] = [cw * EMU, ch * EMU, Math.round((BOX_W - cw) / 2) * EMU, Math.round((BOX_H - ch) / 2) * EMU]
  return `<xdr:oneCellAnchor><xdr:from><xdr:col>${col}</xdr:col><xdr:colOff>${ox}</xdr:colOff><xdr:row>${row}</xdr:row><xdr:rowOff>${oy}</xdr:rowOff></xdr:from>`
    + `<xdr:ext cx="${cx}" cy="${cy}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${id + 1}" name="Foto ${id}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr>`
    + `<xdr:blipFill><a:blip r:embed="rId${id}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>`
    + `<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`
}

// rows: array baris, tiap baris array nilai sesuai urutan kolom template.
// Nilai: string | number | Date | null | { img: { bytes, w, h } } (foto).
function dataSheet(f, n, period, rows) {
  const path = `xl/worksheets/sheet${n}.xml`
  let xml = f[path]
  const style = Object.fromEntries([...xml.matchAll(/<c r="([A-Z]+)6" s="(\d+)"/g)].map((m) => [m[1], m[2]]))
  const openStyle = xml.match(/<c r="[A-Z]+7" s="(\d+)"/)[1]
  const drawing = strFromU8(f[`xl/worksheets/_rels/sheet${n}.xml.rels`]).match(/Target="\/?([^"]*drawings\/[^"]+)"/)[1]
  const drawingRels = drawing.replace('drawings/', 'drawings/_rels/') + '.rels'
  for (const m of strFromU8(f[drawingRels]).matchAll(/Target="\/?([^"]+)"/g)) delete f[m[1].replace('../', 'xl/')]  // placeholder

  const pics = [], rels = []
  const body = rows.map((vals, r) => {
    const row = 6 + r
    const cells = vals.map((v, c) => {
      const L = colName(c)
      if (v?.img) {
        const id = pics.length + 1
        f[`xl/media/foto${n}_${id}.jpg`] = v.img.bytes
        rels.push(`<Relationship Id="rId${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/foto${n}_${id}.jpg"/>`)
        pics.push(anchor(id, c, row - 1, v.img))
      }
      return cell(`${L}${row}`, v === 'Open' ? openStyle : style[L], v)
    })
    return `<row r="${row}" ht="100" customHeight="1">${cells.join('')}</row>`
  }).join('')

  xml = setCell(xml, 'A2', `PT YAHATA FASTENER INDONESIA  |  ${period}`)
  f[path] = xml.replace(/<row r="6".*<\/sheetData>/s, `${body}</sheetData>`)
  f[drawing] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    + pics.join('') + '</xdr:wsDr>'
  f[drawingRels] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + rels.join('') + '</Relationships>'
}

// data: { year, title, period, months, rekap, safety: rows, fiveS: rows }
export function buildXlsx(template, data) {
  const f = unzipSync(template)
  const text = (p) => (typeof f[p] === 'string' ? f[p] : strFromU8(f[p]))
  for (const p of ['xl/worksheets/sheet1.xml', 'xl/worksheets/sheet2.xml', 'xl/worksheets/sheet3.xml']) f[p] = text(p)

  f['xl/worksheets/sheet1.xml'] = grafik(f['xl/worksheets/sheet1.xml'], data)
  dataSheet(f, 2, data.period, data.safety)
  dataSheet(f, 3, data.period, data.fiveS)

  // Nama sheet ikut tahun: "Grafik 2027". Rumus grafik merujuk nama sheet, jadi ikut diganti.
  for (const p of Object.keys(f).filter((p) => p === 'xl/workbook.xml' || /^xl\/charts\/grafik\d\.xml$/.test(p)))
    f[p] = text(p).replaceAll('Grafik 2026', `Grafik ${data.year}`)

  for (const p in f) if (typeof f[p] === 'string') f[p] = strToU8(f[p])
  return zipSync(f, { level: 6 })
}
