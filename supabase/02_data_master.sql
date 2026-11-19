-- 02_data_master.sql
-- Jalankan SETELAH schema.sql dan SETELAH 9 akun dibuat di Authentication -> Users (Auto Confirm User).
-- Aman dijalankan berulang. Ganti isi daftar di bawah dengan data asli bila sudah pasti.

-- 1. Departemen
insert into departments(name) values
  ('Sales & Marketing'), ('Purchasing'), ('Produksi'), ('Maintenance'),
  ('HRGA'), ('Quality'), ('PPIC'), ('Engineering')
on conflict (name) do nothing;

-- 2. Area (CONTOH, ganti dengan area patroli sebenarnya)
insert into areas(name) values
  ('Plant 1 - Forming - Area Depan'),
  ('Plant 1 - Forming - Area Belakang'),
  ('Gudang Material'),
  ('Ruang Panel'),
  ('Lorong Utama')
on conflict (name) do nothing;

-- 3. Daftar user (satu-satunya tempat yang perlu diedit). dept diisi NULL untuk admin.
drop table if exists pg_temp.daftar_user;
create temp table daftar_user as
select * from (values
  ('admin@contoh.com', 'Admin',  null::text,         true),
  ('andi@contoh.com',  'Andi',   'Produksi',         false),
  ('budi@contoh.com',  'Budi',   'Maintenance',      false),
  ('citra@contoh.com', 'Citra',  'Quality',          false),
  ('dewi@contoh.com',  'Dewi',   'HRGA',             false),
  ('eko@contoh.com',   'Eko',    'PPIC',             false),
  ('fajar@contoh.com', 'Fajar',  'Engineering',      false),
  ('gita@contoh.com',  'Gita',   'Purchasing',       false),
  ('hadi@contoh.com',  'Hadi',   'Sales & Marketing',false)
) as v(email, nama, dept, admin);

update profiles p
set name     = v.nama,
    dept_id  = (select d.id from departments d where d.name = v.dept),
    is_admin = v.admin
from daftar_user v
join auth.users u on u.email = v.email
where p.id = u.id;

-- 4. Verifikasi: satu tabel, baris bermasalah di paling atas. Semua harus 'OK'.
select v.email, v.nama, v.dept as departemen_diminta, v.admin,
  case
    when u.id is null                               then 'AKUN BELUM DIBUAT di dashboard'
    when v.dept is not null and p.dept_id is null   then 'NAMA DEPARTEMEN TIDAK COCOK'
    else 'OK'
  end as status
from daftar_user v
left join auth.users u on u.email = v.email
left join profiles   p on p.id = u.id
order by (case when u.id is null or (v.dept is not null and p.dept_id is null) then 0 else 1 end), v.email;
