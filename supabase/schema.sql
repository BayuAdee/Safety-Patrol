-- Schema untuk frontend yfi_patrol_user_portal.tsx (Supabase / Postgres 15+).
-- Jalankan seluruhnya di SQL Editor. Urutan: schema -> bucket (ada di bawah) -> user -> set admin.

-- ========== Master ==========
create table departments (
  id   smallint generated always as identity primary key,
  name text not null unique
);

create table areas (
  id   smallint generated always as identity primary key,
  name text not null unique
);

-- Satu baris per akun login. Dibuat otomatis oleh trigger di bawah.
create table profiles (
  id       uuid primary key references auth.users on delete cascade,
  name     text not null,
  dept_id  smallint references departments,
  is_admin boolean not null default false
);

-- ========== Temuan (tahap Before, diisi Auditor) ==========
create table findings (
  id             bigint generated always as identity primary key,
  type           text not null check (type in ('safety','5s')),
  area_id        smallint not null references areas,
  four_m         text[] not null check (cardinality(four_m) > 0 and four_m <@ array['man','machine','material','method']), -- multi pilihan
  description    text not null,
  target_dept_id smallint not null references departments,
  due_date       date,                                -- opsional: tenggat fleksibel
  photo_before   text not null,                       -- path di bucket 'attachments'
  -- khusus Safety
  stop6          text check (stop6 in ('A','B','C','D','E','F','O')),
  rank           char(1) check (rank in ('A','B','C')),
  kaizen         text[] check (cardinality(kaizen) > 0 and kaizen <@ array['eliminasi','substitusi','modifikasi','admin','apd']), -- saran, opsional, multi
  -- khusus 5S
  five_r         smallint check (five_r between 1 and 5),
  sqcdm          text[] check (cardinality(sqcdm) > 0 and sqcdm <@ array['S','Q','C','D','M']), -- multi pilihan
  created_by     uuid not null default auth.uid() references profiles,
  created_at     timestamptz not null default now(),
  check (type <> 'safety' or (stop6 is not null and rank  is not null and five_r is null and sqcdm is null)),
  check (type <> '5s'     or (five_r is not null and sqcdm is not null and stop6 is null and rank  is null and kaizen is null))
);

-- ========== Tindak lanjut (tahap After, diisi PIC departemen) ==========
-- Primary key = finding_id: satu temuan hanya bisa ditutup sekali.
create table resolutions (
  finding_id  bigint primary key references findings on delete cascade,
  description text not null,
  photo_after text not null,
  rank_after  char(1) check (rank_after in ('A','B','C')),   -- Safety: wajib, 5S: harus kosong
  preventive  text,                                          -- 5S: opsional, Safety: harus kosong
  closed_by   uuid not null default auth.uid() references profiles,
  closed_at   timestamptz not null default now()
);

-- Aturan yang bergantung pada jenis temuan (tidak bisa ditulis sebagai check biasa).
create function public.check_resolution() returns trigger
language plpgsql security definer set search_path = public as
$$ declare t text;
begin
  select type into t from public.findings where id = new.finding_id;
  if t = 'safety' and (new.rank_after is null or new.preventive is not null) then
    raise exception 'Safety: rank_after wajib, preventive harus kosong';
  elsif t = '5s' and new.rank_after is not null then
    raise exception '5S: rank_after harus kosong';
  end if;
  return new;
end $$;

create trigger resolution_rules before insert on resolutions
for each row execute function public.check_resolution();

-- Status dan kode TRF-001 dihitung, tidak disimpan.
create view v_findings with (security_invoker = true) as
select f.*,
       'TRF-' || lpad(f.id::text, 3, '0') as code,
       case when r.finding_id is null then 'open' else 'closed' end as status,
       r.closed_at
from findings f
left join resolutions r on r.finding_id = f.id;

-- ========== Fungsi bantu ==========
-- search_path dikunci, tabel ditulis lengkap (public.): menghindari error "Database error creating new user".
create function public.my_dept() returns smallint
language sql stable security definer set search_path = public as
$$ select dept_id from public.profiles where id = auth.uid() $$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce((select is_admin from public.profiles where id = auth.uid()), false) $$;

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as
$$ begin
  insert into public.profiles(id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email));
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users for each row execute function public.handle_new_user();

-- ========== RLS ==========
alter table departments enable row level security;
alter table areas       enable row level security;
alter table profiles    enable row level security;
alter table findings    enable row level security;
alter table resolutions enable row level security;

-- Master: semua yang login boleh baca, hanya admin yang mengubah.
create policy dept_read  on departments for select to authenticated using (true);
create policy dept_admin on departments for all    to authenticated using (public.is_admin()) with check (public.is_admin());
create policy area_read  on areas       for select to authenticated using (true);
create policy area_admin on areas       for all    to authenticated using (public.is_admin()) with check (public.is_admin());
create policy prof_read  on profiles    for select to authenticated using (true);
create policy prof_admin on profiles    for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- Temuan: lihat milik sendiri atau yang ditujukan ke departemen sendiri. Buat atas nama sendiri.
create policy f_read   on findings for select to authenticated
  using (created_by = auth.uid() or target_dept_id = public.my_dept() or public.is_admin());
create policy f_insert on findings for insert to authenticated
  with check (created_by = auth.uid());
create policy f_admin  on findings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Tindak lanjut: hanya PIC departemen tujuan yang boleh menutup. Tidak ada update oleh user biasa.
create policy r_read   on resolutions for select to authenticated
  using (exists (select 1 from findings f where f.id = finding_id));
create policy r_insert on resolutions for insert to authenticated
  with check (closed_by = auth.uid()
              and exists (select 1 from findings f where f.id = finding_id and f.target_dept_id = public.my_dept()));
create policy r_admin  on resolutions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ========== Storage (foto) ==========
insert into storage.buckets (id, name, public) values ('attachments', 'attachments', false)
on conflict do nothing;
create policy att_insert on storage.objects for insert to authenticated with check (bucket_id = 'attachments');
create policy att_read   on storage.objects for select to authenticated using (bucket_id = 'attachments');
