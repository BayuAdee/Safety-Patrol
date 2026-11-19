-- 06_contoh_data.sql
-- 16 temuan CONTOH (8 Safety, 8 5S) di Semester 2 2026, tanggal = Jumat patroli (2 minggu sekali).
-- 13 sudah ditutup (After), 3 masih Open. Untuk mencoba layar Rekap dan export Excel.
-- Jalankan SETELAH 02_data_master.sql dan 05_after_foto_saja.sql. Aman dijalankan berulang.
-- Hapus semua contoh:  delete from findings where description like '[CONTOH]%';
-- Foto hanya path tiruan (contoh/*.jpg), jadi gambar tidak tampil di aplikasi.

delete from findings where description like '[CONTOH]%';   -- resolutions ikut terhapus (cascade)

-- Satu perintah saja (tanpa tabel sementara): temuan dan perbaikannya masuk bersamaan, atau gagal semua.
with contoh as (
select * from (values
--  jenis     tanggal       area                                 auditor      tujuan (PIC)   4M                   temuan                                              stop6 rank kaizen                five_r sqcdm      due           selesai (hari, null = Open)
  ('safety', '2026-07-03', 'Ruang Panel',                        'Produksi',  'Maintenance', '{machine}',         'Kabel panel listrik terkelupas',                    'E',  'A', '{modifikasi}',       null, null,        '2026-07-10', 4),
  ('5s',     '2026-07-03', 'Gudang Material',                    'Quality',   'PPIC',        '{material,method}', 'Material tidak diberi label',                       null, null, null,                '2',  '{Q,D}',     null,         6),
  ('safety', '2026-07-17', 'Lorong Utama',                       'HRGA',      'Produksi',    '{man}',             'Operator tidak memakai sarung tangan',              'A',  'B', '{apd}',              null, null,        '2026-07-24', 3),
  ('5s',     '2026-07-17', 'Plant 1 - Forming - Area Depan',     'PPIC',      'Produksi',    '{method}',          'Kardus bekas menumpuk di jalur',                    null, null, null,                '1',  '{S}',       null,         2),
  ('safety', '2026-08-14', 'Plant 1 - Forming - Area Belakang',  'Quality',   'Engineering', '{machine}',         'Cover pulley mesin forming lepas',                  'A',  'A', '{modifikasi,admin}', null, null,        '2026-08-21', 7),
  ('5s',     '2026-08-14', 'Ruang Panel',                        'Produksi',  'Maintenance', '{method}',          'Ruang panel berdebu',                               null, null, null,                '3',  '{S,Q}',     null,         5),
  ('safety', '2026-08-28', 'Gudang Material',                    'Produksi',  'PPIC',        '{material,method}', 'Tumpukan coil terlalu tinggi',                      'B',  'B', '{admin}',            null, null,        null,         6),
  ('5s',     '2026-08-28', 'Lorong Utama',                       'Quality',   'HRGA',        '{man}',             'Sampah tercecer di lorong',                         null, null, null,                '3',  '{M}',       null,         1),
  ('safety', '2026-09-11', 'Lorong Utama',                       'PPIC',      'HRGA',        '{method}',          'APAR terhalang troli',                              'F',  'B', '{eliminasi}',        null, null,        '2026-09-18', 2),
  ('5s',     '2026-09-25', 'Plant 1 - Forming - Area Depan',     'HRGA',      'Produksi',    '{man,method}',      'Alat kerja tidak kembali ke tempatnya',             null, null, null,                '2',  '{Q,C}',     null,         4),
  ('safety', '2026-10-09', 'Plant 1 - Forming - Area Depan',     'HRGA',      'Produksi',    '{man}',             'Forklift melaju kencang di area produksi',          'C',  'A', '{admin}',            null, null,        '2026-10-16', 5),
  ('5s',     '2026-10-23', 'Gudang Material',                    'Produksi',  'Quality',     '{material}',        'Produk NG bercampur dengan produk OK',              null, null, null,                '1',  '{Q}',       '2026-10-30', null),
  ('safety', '2026-11-06', 'Ruang Panel',                        'Quality',   'Maintenance', '{machine}',         'Stop kontak di belakang mesin forming tidak rapi',  'E',  'B', '{modifikasi}',       null, null,        '2026-11-20', 7),
  ('5s',     '2026-11-06', 'Plant 1 - Forming - Area Depan',     'Quality',   'Produksi',    '{material,method}', 'Material before proses tidak diberi identitas',     null, null, null,                '3',  '{S,Q,D,M}', '2026-11-20', 5),
  ('safety', '2026-11-06', 'Plant 1 - Forming - Area Belakang',  'PPIC',      'Engineering', '{machine}',         'Oli bocor di lantai sekitar mesin',                 'D',  'B', null,                 null, null,        '2026-11-20', null),
  ('5s',     '2026-11-06', 'Lorong Utama',                       'HRGA',      'Maintenance', '{method}',          'Selang angin melintang di lantai',                  null, null, null,                '2',  '{S}',       null,         null)
) v(type, tgl, area, auditor, target, four_m, descr, stop6, rank, kaizen, five_r, sqcdm, due, selesai)
),
-- Akun pertama di tiap departemen. Departemen tanpa akun -> admin.
akun as (
  select d.name as dept, coalesce(
    (select p.id from profiles p where p.dept_id = d.id order by p.name limit 1),
    (select id from profiles where is_admin order by name limit 1)) as id
  from departments d
),
baru as (
  insert into findings(type, area_id, four_m, description, target_dept_id, due_date, photo_before,
                       stop6, rank, kaizen, five_r, sqcdm, created_by, created_at)
  select c.type,
         coalesce((select id from areas where name = c.area), (select min(id) from areas)),
         c.four_m::text[], '[CONTOH] ' || c.descr,
         (select id from departments where name = c.target),
         c.due::date, 'contoh/before.jpg',
         c.stop6, c.rank, c.kaizen::text[], c.five_r::smallint, c.sqcdm::text[],
         (select id from akun where dept = c.auditor),
         (c.tgl || ' 09:00+07')::timestamptz            -- jam patroli 09:00 WIB
  from contoh c
  returning id, description, created_at
)
insert into resolutions(finding_id, photo_after, closed_by, closed_at)
select b.id, 'contoh/after.jpg', (select id from akun where dept = c.target),
       b.created_at + c.selesai * interval '1 day' + interval '5 hours'
from baru b
join contoh c on b.description = '[CONTOH] ' || c.descr
where c.selesai is not null;

-- Cek: harus 16 baris, 13 closed dan 3 open.
select code, type, created_at::date as tanggal, status, closed_at::date as selesai, description
from v_findings where description like '[CONTOH]%' order by created_at, type;
