# Membuat public/rekap-template.xlsx dari Excel patroli asli (sekali jalan, saat format berubah).
#   python scripts/buat_template.py "Safety dan 5s Patrol dan grafik.xlsx"
# Isi template: sheet "Grafik 2026" (gaya, logo, 4 grafik asli) + sheet SAFETY dan 5S (header rapi,
# 1 baris contoh gaya). Data internal TIDAK ikut: sheet patroli dibuang, cache angka grafik dihapus.
# Browser (src/xlsx.js) yang mengisi angka, daftar temuan, dan foto.
import re, sys, zipfile
from io import BytesIO
from PIL import Image as PILImage
from openpyxl import load_workbook
from openpyxl.drawing.image import Image
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.packaging import manifest
manifest.mimetypes.add_type('image/webp', '.webp')  # Excel asli memuat foto webp; openpyxl belum mengenalnya

SRC = sys.argv[1]
OUT = 'public/rekap-template.xlsx'
GRAFIK = 'Grafik 2026'

# Kolom data. HARUS sama urutannya dengan SHEETS di src/xlsx.js. (judul, lebar, grup header)
BASE = [('NO', 5), ('KODE', 10), ('TANGGAL', 12), ('MINGGU', 10), ('AREA', 20), ('FOTO BEFORE', 26),
        ('TEMUAN', 34), ('MATERIAL', 10, '4M'), ('MACHINE', 10, '4M'), ('MAN', 10, '4M'), ('METHOD', 10, '4M')]
TAIL = [('AUDITOR', 14), ('PIC', 14), ('DUE DATE', 12), ('ACTUAL PERBAIKAN', 13), ('FOTO AFTER', 26), ('PROGRES', 11)]
SHEETS = {
    'SAFETY': ('SAFETY PATROL & 4M ANALYSIS', BASE + [('STOP 6', 16), ('RANK', 7), ('SARAN KAIZEN', 22)] + TAIL),
    '5S': ('5S/5R PATROL & 4M ANALYSIS', BASE + [('5R', 12), ('SQCDM', 12)] + TAIL),
}

thin = Side(style='thin', color='000000')
box = Border(left=thin, right=thin, top=thin, bottom=thin)
head_fill = PatternFill('solid', fgColor='1F2937')   # gray-800, selaras tema monokrom
head_font = Font(bold=True, color='FFFFFF', size=10)
center = Alignment(horizontal='center', vertical='center', wrap_text=True)
left = Alignment(horizontal='left', vertical='center', wrap_text=True)

wb = load_workbook(SRC, keep_links=False)
for name in wb.sheetnames:
    if name != GRAFIK:
        del wb[name]
g = wb[GRAFIK]
g._charts.clear(); g._images.clear()        # grafik & logo asli disuntik utuh di bawah
g.sheet_view.zoomScale = 70
g.defined_names.clear(); wb.defined_names.clear()   # 300-an nama range rusak (#REF!) dari file asli
g['B15'] = 'Status Open Minggu 1'                     # typo "Stus" di file asli
g.page_setup.orientation, g.page_setup.paperSize = 'landscape', g.PAPERSIZE_A4
g.sheet_properties.pageSetUpPr.fitToPage = True
g.page_setup.fitToWidth = g.page_setup.fitToHeight = 1    # satu halaman

for name, (title, cols) in SHEETS.items():
    ws = wb.create_sheet(name)
    ws.sheet_view.showGridLines = False
    ws.sheet_view.zoomScale = 80
    ws['A1'] = title
    ws['A1'].font = Font(bold=True, size=16)
    ws['A2'] = 'PT YAHATA FASTENER INDONESIA'          # diganti browser: + periode
    ws['A2'].font = Font(bold=True, size=11, color='4B5563')
    for i, c in enumerate(cols, 1):
        L = ws.cell(4, i).column_letter
        ws.column_dimensions[L].width = c[1]
        for r in (4, 5):
            ws.cell(r, i).fill, ws.cell(r, i).font = head_fill, head_font
            ws.cell(r, i).alignment, ws.cell(r, i).border = center, box
        if len(c) == 3:                                  # header 2 tingkat: 4M di atas
            ws.cell(5, i, c[0])
        else:
            ws.cell(4, i, c[0]); ws.merge_cells(start_row=4, end_row=5, start_column=i, end_column=i)
    m = [i for i, c in enumerate(cols, 1) if len(c) == 3]
    ws.cell(4, m[0], '4M'); ws.merge_cells(start_row=4, end_row=4, start_column=m[0], end_column=m[-1])
    ws.row_dimensions[4].height = 20; ws.row_dimensions[5].height = 20
    # Baris 6 = contoh gaya baris data, baris 7 kolom terakhir = gaya PROGRES "Open" (merah).
    for i, c in enumerate(cols, 1):
        cell = ws.cell(6, i)
        cell.border = box
        cell.alignment = left if c[0] in ('AREA', 'TEMUAN', 'SARAN KAIZEN', 'SQCDM', 'STOP 6', 'AUDITOR', 'PIC') else center
        cell.font = Font(size=10, bold=c[0] in ('PROGRES', 'MATERIAL', 'MACHINE', 'MAN', 'METHOD'))
        if c[0] in ('TANGGAL', 'DUE DATE', 'ACTUAL PERBAIKAN'):
            cell.number_format = 'dd/mm/yyyy'
    o = ws.cell(7, len(cols))
    o.border, o.alignment, o.font = box, center, Font(size=10, bold=True, color='DC2626')
    ws.freeze_panes = 'A6'
    ws.page_setup.orientation, ws.page_setup.paperSize = 'landscape', ws.PAPERSIZE_A4
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.page_setup.fitToWidth, ws.page_setup.fitToHeight = 1, 0   # 1 halaman lebar, tinggi bebas
    ws.print_title_rows = '4:5'                                   # header diulang tiap halaman
    ws.page_margins.left = ws.page_margins.right = 0.3
    png = BytesIO(); PILImage.new('RGB', (8, 8), 'white').save(png, 'PNG')
    ws.add_image(Image(png), 'F6')                       # placeholder: menyiapkan drawing, diganti browser

buf = BytesIO(); wb.save(buf)

# ---- Suntik drawing Grafik asli (4 grafik + 2 logo) ke sheet Grafik ----
src = zipfile.ZipFile(SRC)
rd = lambda n: src.read(n)
tpl = zipfile.ZipFile(BytesIO(buf.getvalue()))
files = {n: tpl.read(n) for n in tpl.namelist()}

def strip_cache(xml):  # angka lama dibuang; Excel menggambar ulang dari sel
    return re.sub(rb'<c:(num|str)Cache>.*?</c:\1Cache>', b'', xml, flags=re.S)

files['xl/drawings/grafik.xml'] = rd('xl/drawings/drawing3.xml')
files['xl/drawings/_rels/grafik.xml.rels'] = (rd('xl/drawings/_rels/drawing3.xml.rels')
    .replace(b'../media/image24.jpg', b'../media/k3.jpg').replace(b'../media/image25.jpg', b'../media/yahata.jpg')
    .replace(b'../charts/chart', b'../charts/grafik'))
files['xl/media/k3.jpg'] = rd('xl/media/image24.jpg')
files['xl/media/yahata.jpg'] = rd('xl/media/image25.jpg')
for i in range(1, 5):
    files[f'xl/charts/grafik{i}.xml'] = strip_cache(rd(f'xl/charts/chart{i}.xml'))
    files[f'xl/charts/_rels/grafik{i}.xml.rels'] = (rd(f'xl/charts/_rels/chart{i}.xml.rels')
        .replace(b'Target="colors', b'Target="grafikcolors').replace(b'Target="style', b'Target="grafikstyle'))
    files[f'xl/charts/grafikstyle{i}.xml'] = rd(f'xl/charts/style{i}.xml')
    files[f'xl/charts/grafikcolors{i}.xml'] = rd(f'xl/charts/colors{i}.xml')

sheet = 'xl/worksheets/sheet1.xml'   # openpyxl: sheet pertama = Grafik
assert b'<drawing' not in files[sheet]
files[sheet] = files[sheet].replace(b'</worksheet>', b'<drawing r:id="rIdGrafik"/></worksheet>')
if b'xmlns:r=' not in files[sheet][:600]:
    files[sheet] = files[sheet].replace(b'<worksheet ', b'<worksheet xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ', 1)
rels = 'xl/worksheets/_rels/sheet1.xml.rels'
rel = b'<Relationship Id="rIdGrafik" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/grafik.xml"/>'
files[rels] = (files[rels].replace(b'</Relationships>', rel + b'</Relationships>') if rels in files else
    b'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + rel + b'</Relationships>')

ct = files['[Content_Types].xml']
add = b'<Override PartName="/xl/drawings/grafik.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>'
for i in range(1, 5):
    add += (f'<Override PartName="/xl/charts/grafik{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>'
            f'<Override PartName="/xl/charts/grafikstyle{i}.xml" ContentType="application/vnd.ms-office.chartstyle+xml"/>'
            f'<Override PartName="/xl/charts/grafikcolors{i}.xml" ContentType="application/vnd.ms-office.chartcolorstyle+xml"/>').encode()
if b'Extension="jpg"' not in ct:
    add += b'<Default Extension="jpg" ContentType="image/jpeg"/>'
files['[Content_Types].xml'] = ct.replace(b'</Types>', add + b'</Types>')

with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as z:
    for n, b in files.items():
        z.writestr(n, b)
print('OK', OUT)
