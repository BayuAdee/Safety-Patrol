# Membuat public/rekap-template.xlsx (sekali jalan, saat format berubah):  python scripts/buat_template.py
# Isi: "Grafik Bulanan" (tabel per bulan Safety & 5S, 1-12 baris, + 4 grafik), "Grafik Kategori" (5R/SQCDM, STOP-6/Rank,
# 12 grafik), SAFETY dan 5S (header + 1 baris contoh gaya; browser
# menyalinnya jadi satu sheet per patroli lalu membuang keduanya). Browser (src/xlsx.js) mengisi angka, daftar temuan, foto,
# dan memendekkan rentang grafik bulanan sesuai jumlah bulan.
import zipfile
from io import BytesIO
from PIL import Image as PILImage
from openpyxl import Workbook
from openpyxl.chart import BarChart, Reference
from openpyxl.chart.label import DataLabelList
from openpyxl.chart.marker import DataPoint
from openpyxl.chart.text import RichText
from openpyxl.drawing.text import CharacterProperties, Paragraph, ParagraphProperties
from openpyxl.drawing.image import Image
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side

OUT = 'public/rekap-template.xlsx'

# Kolom data. HARUS sama urutannya dengan SHEETS di src/xlsx.js. (judul, lebar, grup header)
BASE = [('NO', 5), ('KODE', 10), ('TANGGAL', 12), ('AREA', 20), ('FOTO BEFORE', 26),
        ('TEMUAN/PROBLEM', 34), ('MATERIAL', 10, '4M'), ('MACHINE', 10, '4M'), ('MAN', 10, '4M'), ('METHOD', 10, '4M')]
TAIL = [('AUDITOR', 14), ('PIC', 14), ('KAIZEN', 30), ('PIC PERBAIKAN', 14), ('DUE DATE', 12), ('ACTUAL PERBAIKAN', 13), ('FOTO AFTER', 26), ('PROGRES', 11)]
SHEETS = {
    'SAFETY': ('SAFETY PATROL & 4M ANALYSIS', BASE + [('STOP 6', 16), ('POIN BEFORE', 8), ('RANK BEFORE', 8), ('KAIZEN CATEGORY', 22)]
               + TAIL[:-1] + [('POIN AFTER', 8), ('RANK AFTER', 8)] + TAIL[-1:]),
    '5S': ('5S/5R PATROL & 4M ANALYSIS', BASE + [('KATEGORI', 12), ('S,Q,C,D,M', 12, 'EFFECT')] + TAIL),
}

# Keterangan kode di sheet 5S (sama dengan SQCDM & FIVE_R di src/ui.jsx). Sampai R3 saja (diminta pemilik).
LEGEND = [('S', 'Safety'), ('Q', 'Quality'), ('C', 'Cost'), ('D', 'Delivery'), ('M', 'Moral'),
          ('R1', 'Ringkas'), ('R2', 'Rapi'), ('R3', 'Resik')]

thin = Side(style='thin', color='000000')
box = Border(left=thin, right=thin, top=thin, bottom=thin)
head_fill = PatternFill('solid', fgColor='1F2937')   # gray-800, selaras tema monokrom
head_font = Font(bold=True, color='FFFFFF', size=10)
center = Alignment(horizontal='center', vertical='center', wrap_text=True)
left = Alignment(horizontal='left', vertical='center', wrap_text=True)


def header(ws, title):   # logo YFI + judul + baris periode (B2 diganti browser)
    ws.sheet_view.showGridLines = False
    jpg = BytesIO(); PILImage.open('public/logo.jpg').convert('RGB').save(jpg, 'JPEG')   # logo.jpg sebenarnya WebP
    logo = Image(jpg); logo.width = logo.height = 48
    ws.add_image(logo, 'A1')
    ws['B1'] = title; ws['B1'].font = Font(bold=True, size=16)
    ws['B2'] = 'PT YAHATA FASTENER INDONESIA'; ws['B2'].font = Font(bold=True, size=11, color='4B5563')
    ws.row_dimensions[1].height = ws.row_dimensions[2].height = 20
    ws.page_setup.orientation, ws.page_setup.paperSize = 'landscape', ws.PAPERSIZE_A4
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.page_setup.fitToWidth = ws.page_setup.fitToHeight = 1    # satu halaman

def table(ws, top, head, labs):   # header di baris top, angka 0 (diisi browser) mulai kolom B
    for c, h in enumerate(head, 1):
        x = ws.cell(top, c, h); x.fill, x.font, x.alignment, x.border = head_fill, head_font, center, box
    for r, lab in enumerate(labs, top + 1):
        ws.cell(r, 1, lab).border = box
        for c in range(2, len(head) + 1):
            x = ws.cell(r, c, 0); x.border, x.alignment = box, center

GRAY = '374151'
# Warna grafik = layar Rekap (C di src/pages/Rekap.jsx, palet dataviz yang sudah dicek buta warna). HARUS sama.
C = dict(blue='2A78D6', orange='EB6834', aqua='1BAF7A', yellow='EDA100', magenta='E87BA4', green='008300', violet='6250D6', red='E34948', gray='4B5563')
SQ_C = [C[k] for k in ('blue', 'orange', 'aqua', 'yellow', 'magenta')]                           # S Q C D M
S6_C = [C[k] for k in ('gray', 'blue', 'orange', 'aqua', 'yellow', 'magenta', 'green', 'violet')]  # Total, A..F, O
RANK_C = [C[k] for k in ('gray', 'red', 'yellow', 'aqua')]                                         # Total, A, B, C

def bar(ws, at, title, data, cats, colors=(GRAY,), rows=False, width=12, dense=False, points=None):
    ch = BarChart(); ch.title = title; ch.title.overlay = False
    ch.add_data(data, from_rows=rows, titles_from_data=len(colors) > 1)
    ch.set_categories(cats)
    for s, col in zip(ch.series, colors):
        s.graphicalProperties.solidFill = col; s.graphicalProperties.line.solidFill = col
    for i, col in enumerate(points or []):   # satu seri, warna per kategori (sama dengan layar)
        pt = DataPoint(idx=i); pt.graphicalProperties.solidFill = col; pt.graphicalProperties.line.solidFill = col
        ch.series[0].dPt.append(pt)
    ch.dataLabels = DataLabelList(showVal=True, showSerName=False, showCatName=False, showLegendKey=False, showPercent=False)
    if dense:   # grafik bulanan (s.d. 12 bulan x 4 batang): angka 0 tidak ditulis, batang lebih lebar, label 7pt
        ch.dataLabels.numFmt = '0;-0;;'                        # bagian ke-3 format = nol -> kosong
        ch.gapWidth = 30
        small = CharacterProperties(sz=700)
        ch.dataLabels.txPr = RichText(p=[Paragraph(pPr=ParagraphProperties(defRPr=small), endParaRPr=small)])
    # ponytail: sumbu Y disembunyikan (angka sudah di atas batang); Excel tidak punya skala "bilangan bulat saja".
    ch.x_axis.delete = False                                   # openpyxl 3.1 menyembunyikan sumbu bila tidak diset
    ch.y_axis.delete = True; ch.y_axis.majorGridlines = None; ch.y_axis.scaling.min = 0
    if len(colors) == 1: ch.legend = None
    else: ch.legend.position, ch.legend.overlay = 'b', False
    ch.width, ch.height = width, 7
    ws.add_chart(ch, at)

wb = Workbook()

# ---- Grafik Bulanan: Safety header baris 4 (data 5-16), 5S header baris 20 (data 21-32), 12 baris bulan ----
# Kolom B..H HARUS sama urutannya dengan BULANAN di src/xlsx.js. Grafik merujuk baris 5-16 / 21-32;
# browser memendekkan ke jumlah bulan yang dipilih.
g = wb.active
g.title = 'Grafik Bulanan'
header(g, 'REKAPITULASI TEMUAN SAFETY & 5S/5R')
g.column_dimensions['A'].width = 10
COLS = ['Minggu 1', 'Minggu 2', 'Total', 'Open Minggu 1', 'Close Minggu 1', 'Open Minggu 2', 'Close Minggu 2']
for top, name in [(4, 'Safety'), (20, '5S/5R')]:
    g.cell(top - 1, 1, f'Rekap Temuan {name}').font = Font(bold=True, size=11)
    table(g, top, ['Bulan'] + COLS, [f'Bulan {i}' for i in range(1, 13)])
    g.row_dimensions[top].height = 30
    cats = Reference(g, min_col=1, min_row=top + 1, max_row=top + 12)
    bar(g, f'J{top}', f'Temuan {name} per Minggu', Reference(g, min_col=2, max_col=4, min_row=top, max_row=top + 12), cats,
        (C['blue'], C['orange'], C['violet']), width=18, dense=True)
    bar(g, f'U{top}', f'Status {name}: Open & Close', Reference(g, min_col=5, max_col=8, min_row=top, max_row=top + 12), cats,
        (C['orange'], C['blue'], C['red'], C['aqua']), width=18, dense=True)

# ---- Grafik Kategori: B5:H9 = 5R (Before, Sisa Open, S..M), B13:E20 = STOP-6 x Rank (kategori() di src/xlsx.js) ----
k = wb.create_sheet('Grafik Kategori')
header(k, 'GRAFIK TEMUAN SAFETY & 5S/5R')
k.column_dimensions['A'].width = 14
table(k, 4, ['5R', 'Before', 'Sisa (Open)', 'S', 'Q', 'C', 'D', 'M'], ['R1 (Ringkas)', 'R2 (Rapi)', 'R3 (Resik)', 'R4 (Rawat)', 'R5 (Rajin)'])
table(k, 12, ['STOP-6', 'Total', 'A', 'B', 'C'], ['Total', 'A', 'B', 'C', 'D', 'E', 'F', 'O'])
k['B11'] = 'Rank (kolom)'; k['B11'].font = Font(size=9, color='6B7280')
ref = lambda c1, r1, c2=None, r2=None: Reference(k, min_col=c1, min_row=r1, max_col=c2 or c1, max_row=r2 or r1)
R5 = ref(1, 5, 1, 9); S6 = ref(1, 13, 1, 20)
bar(k, 'J4', 'Temuan 5R Berdasarkan Kategori', ref(2, 5, 2, 9), R5, (C['violet'],))
bar(k, 'R4', 'Target Perbaikan 5R (sasaran Sisa = 0)', ref(2, 4, 3, 9), R5, (C['blue'], C['red']))
for i in range(5):
    bar(k, f'{"JRZ"[i % 3]}{19 + 15 * (i // 3)}', f'R{i + 1} per S, Q, C, D, M', ref(4, 5 + i, 8), ref(4, 4, 8), rows=True, points=SQ_C)
bar(k, 'J49', 'Temuan Safety Berdasarkan STOP-6', ref(2, 13, 2, 20), S6, points=S6_C)
bar(k, 'R49', 'Temuan Safety Berdasarkan Rank', ref(2, 13, 5), ref(2, 12, 5), rows=True, points=RANK_C)
for i, rk in enumerate('ABC'):
    bar(k, f'{"JRZ"[i]}64', f'Rank {rk} Berdasarkan STOP-6', ref(3 + i, 13, 3 + i, 20), S6, points=S6_C)

def data_sheets(wb):   # sheet SAFETY dan 5S
    for name, (title, cols) in SHEETS.items():
        ws = wb.create_sheet(name)
        ws.sheet_view.showGridLines = False
        ws.sheet_view.zoomScale = 80
        ws['A1'] = title
        ws['A1'].font = Font(bold=True, size=16)
        ws['A2'] = 'PT YAHATA FASTENER INDONESIA'          # diganti browser: + periode
        ws['A2'].font = Font(bold=True, size=11, color='4B5563')
        if name == '5S':   # Standar Information di kanan judul (kolom G..N, baris 1-3); tabel tetap mulai baris 4
            for i, (k, v) in enumerate(LEGEND, 7):
                for r, val, font, fill in ((1, None, head_font, head_fill), (2, k, Font(bold=True, size=10), PatternFill('solid', fgColor='E5E7EB')), (3, v, Font(size=10), None)):
                    cell = ws.cell(r, i, val)
                    cell.font, cell.alignment, cell.border = font, center, box
                    if fill: cell.fill = fill
            ws.cell(1, 7, 'STANDAR INFORMATION')
            ws.merge_cells(start_row=1, end_row=1, start_column=7, end_column=6 + len(LEGEND))
            ws.row_dimensions[3].height = 18
        for i, c in enumerate(cols, 1):
            L = ws.cell(4, i).column_letter
            ws.column_dimensions[L].width = c[1]
            for r in (4, 5):
                ws.cell(r, i).fill, ws.cell(r, i).font = head_fill, head_font
                ws.cell(r, i).alignment, ws.cell(r, i).border = center, box
            if len(c) == 3:                                  # header 2 tingkat: grup (4M, EFFECT) di atas
                ws.cell(5, i, c[0])
            else:
                ws.cell(4, i, c[0]); ws.merge_cells(start_row=4, end_row=5, start_column=i, end_column=i)
        for g in dict.fromkeys(c[2] for c in cols if len(c) == 3):
            m = [i for i, c in enumerate(cols, 1) if c[2:] == (g,)]
            ws.cell(4, m[0], g)
            if len(m) > 1: ws.merge_cells(start_row=4, end_row=4, start_column=m[0], end_column=m[-1])
        ws.row_dimensions[4].height = 20; ws.row_dimensions[5].height = 20
        # Baris 6 = contoh gaya baris data, baris 7 kolom terakhir = gaya PROGRES "Open" (merah).
        for i, c in enumerate(cols, 1):
            cell = ws.cell(6, i)
            cell.border = box
            cell.alignment = left if c[0] in ('AREA', 'TEMUAN/PROBLEM', 'KAIZEN CATEGORY', 'KAIZEN', 'STOP 6', 'AUDITOR', 'PIC', 'PIC PERBAIKAN') else center
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
        ws.add_image(Image(png), 'E6')                       # placeholder: menyiapkan drawing, diganti browser

data_sheets(wb)
buf = BytesIO(); wb.save(buf)
# openpyxl menulis numFmt label tanpa sourceLinked="0", sehingga Excel tetap memakai format sel (angka 0 tampil).
src = zipfile.ZipFile(buf)
with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as z:
    for n in src.namelist():
        b = src.read(n)
        if n.startswith('xl/charts/'): b = b.replace(b'<numFmt formatCode="0;-0;;" />', b'<numFmt formatCode="0;-0;;" sourceLinked="0"/>')
        z.writestr(n, b)
print('OK', OUT)
