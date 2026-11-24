<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

// 16 temuan [CONTOH] Semester 2 2026, 13 Close, 3 Open.
// php artisan db:seed --class=ContohSeeder   (jalankan setelah db:seed; aman berulang)
// Foto hanya path tiruan, jadi aplikasi dan Excel menulis "(foto tidak tersedia)".
// Poin Safety: keparahan (2/6/12), frekuensi (3/4/5), kemungkinan (1/4/8). After = kecil + rendah, frekuensi tetap.
class ContohSeeder extends Seeder
{
    public function run(): void
    {
        DB::unprepared(<<<'SQL'
delete from findings where description like '[CONTOH]%';

with contoh as (
select * from (values
  ('safety', '2026-07-03', 'PARKIR MOBIL DEPAN, GARDU PLN',                        'Produksi',  'Maintenance', '{machine}',         'Kabel panel listrik terkelupas',                    'E',  12,   5,    4,    '{modifikasi}',       null, null,        '2026-07-10', 4),
  ('5s',     '2026-07-03', 'TAPPING BELAKANG',                    'Quality',   'PPIC',        '{material,method}', 'Material tidak diberi label',                       null, null, null, null, null,                '2',  '{Q,D}',     null,         6),
  ('safety', '2026-07-17', 'PLANT 2 BAGIAN DEPAN',                       'HRGA',      'Produksi',    '{man}',             'Operator tidak memakai sarung tangan',              'A',  6,    5,    4,    '{apd}',              null, null,        '2026-07-24', 3),
  ('5s',     '2026-07-17', 'FORMING AREA DEPAN',                 'PPIC',      'Produksi',    '{method}',          'Kardus bekas menumpuk di jalur',                    null, null, null, null, null,                '1',  '{S}',       null,         2),
  ('safety', '2026-08-14', 'GUDANG OLI DAN FORMING AREA BELAKANG', 'Quality',   'Engineering', '{machine}',         'Cover pulley mesin forming lepas',                  'A',  12,   5,    8,    '{modifikasi,admin}', null, null,        '2026-08-21', 7),
  ('5s',     '2026-08-14', 'PARKIR MOBIL DEPAN, GARDU PLN',                        'Produksi',  'Maintenance', '{method}',          'Ruang panel berdebu',                               null, null, null, null, null,                '3',  '{S,Q}',     null,         5),
  ('safety', '2026-08-28', 'TAPPING BELAKANG',                    'Produksi',  'PPIC',        '{material,method}', 'Tumpukan coil terlalu tinggi',                      'B',  6,    4,    4,    '{admin}',            null, null,        null,         6),
  ('5s',     '2026-08-28', 'PLANT 2 BAGIAN DEPAN',                       'Quality',   'HRGA',        '{man}',             'Sampah tercecer di lorong',                         null, null, null, null, null,                '3',  '{M}',       null,         1),
  ('safety', '2026-09-11', 'PLANT 2 BAGIAN DEPAN',                       'PPIC',      'HRGA',        '{method}',          'APAR terhalang troli',                              'F',  12,   3,    1,    '{eliminasi}',        null, null,        '2026-09-18', 2),
  ('5s',     '2026-09-25', 'FORMING AREA DEPAN',                 'HRGA',      'Produksi',    '{man,method}',      'Alat kerja tidak kembali ke tempatnya',             null, null, null, null, null,                '2',  '{Q,C}',     null,         4),
  ('safety', '2026-10-09', 'FORMING AREA DEPAN',                 'HRGA',      'Produksi',    '{man}',             'Forklift melaju kencang di area produksi',          'C',  12,   5,    4,    '{admin}',            null, null,        '2026-10-16', 5),
  ('5s',     '2026-10-23', 'TAPPING BELAKANG',                    'Produksi',  'Quality',     '{material}',        'Produk NG bercampur dengan produk OK',              null, null, null, null, null,                '1',  '{Q}',       '2026-10-30', null),
  ('safety', '2026-11-06', 'PARKIR MOBIL DEPAN, GARDU PLN',                        'Quality',   'Maintenance', '{machine}',         'Stop kontak di belakang mesin forming tidak rapi',  'E',  6,    5,    4,    '{modifikasi}',       null, null,        '2026-11-20', 7),
  ('5s',     '2026-11-06', 'FORMING AREA DEPAN',                 'Quality',   'Produksi',    '{material,method}', 'Material before proses tidak diberi identitas',     null, null, null, null, null,                '3',  '{S,Q,D,M}', '2026-11-20', 5),
  ('safety', '2026-11-06', 'GUDANG OLI DAN FORMING AREA BELAKANG', 'PPIC',      'Engineering', '{machine}',         'Oli bocor di lantai sekitar mesin',                 'D',  2,    5,    4,    null,                 null, null,        '2026-11-20', null),
  ('5s',     '2026-11-06', 'PLANT 2 BAGIAN DEPAN',                       'HRGA',      'Maintenance', '{method}',          'Selang angin melintang di lantai',                  null, null, null, null, null,                '2',  '{S}',       null,         null)
) v(type, tgl, area, auditor, target, four_m, descr, stop6, severity, frequency, probability, kaizen, five_r, sqcdm, due, selesai)
),
-- Akun pertama di tiap departemen. Departemen tanpa akun -> admin.
akun as (
  select d.name as dept, coalesce(
    (select u.id from users u where u.dept_id = d.id order by u.name limit 1),
    (select id from users where role <> 'user' order by name limit 1)) as id
  from departments d
),
baru as (
  insert into findings(type, area_id, four_m, description, target_dept_id, due_date, photo_before,
                       stop6, severity, frequency, probability, kaizen, five_r, sqcdm, created_by, created_at)
  select c.type,
         coalesce((select id from areas where name = c.area), (select min(id) from areas)),
         c.four_m::text[], '[CONTOH] ' || c.descr,
         (select id from departments where name = c.target),
         c.due::date, 'contoh/before.jpg',
         c.stop6, c.severity, c.frequency, c.probability, c.kaizen::text[], c.five_r::smallint, c.sqcdm::text[],
         (select id from akun where dept = c.auditor),
         (c.tgl || ' 09:00+07')::timestamptz
  from contoh c
  returning id, description, created_at
)
insert into resolutions(finding_id, photo_after, severity_after, frequency_after, probability_after, closed_by, closed_at)
select b.id, 'contoh/after.jpg',
       case when c.type = 'safety' then 2 end, c.frequency, case when c.type = 'safety' then 1 end,
       (select id from akun where dept = c.target),
       b.created_at + c.selesai * interval '1 day' + interval '5 hours'
from baru b
join contoh c on b.description = '[CONTOH] ' || c.descr
where c.selesai is not null;
SQL);
    }
}
