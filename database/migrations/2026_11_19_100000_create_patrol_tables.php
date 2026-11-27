<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Tabel aplikasi. Data akun (name, dept_id, role, active) ada di tabel users.
// Aturan akses dicek di PatrolController; aturan isian dijaga CHECK di database.
return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
-- Rank Safety dari total poin (keparahan + frekuensi + kemungkinan, 6..25), legenda Excel patroli.
-- Ambang yang sama ada di rankOf (src/ui.jsx) untuk pratinjau di form.
-- "or replace": migrate:fresh menghapus tabel, tapi fungsi tetap tertinggal.
create or replace function risk_rank(score int) returns char(1) immutable language sql
  return case when score >= 19 then 'A' when score >= 10 then 'B' when score >= 6 then 'C' end;

create table departments (
  id   smallint generated always as identity primary key,
  name text not null unique
);

create table areas (
  id   smallint generated always as identity primary key,
  name text not null unique
);

-- role: user (buat & tutup temuan), admin (+ Rekap), superadmin (+ kelola akun, area, departemen).
-- Akun tidak dihapus (namanya dipakai temuan lama), cukup active = false.
alter table users
  add column dept_id smallint references departments,
  add column role    text not null default 'user' check (role in ('user','admin','superadmin')),
  add column active  boolean not null default true,
  add check (role <> 'user' or dept_id is not null);

create table findings (
  id             bigint generated always as identity primary key,
  type           text not null check (type in ('safety','5s')),
  area_id        smallint not null references areas,
  four_m         text[] not null check (cardinality(four_m) > 0 and four_m <@ array['man','machine','material','method']),
  description    text not null,
  target_dept_id smallint not null references departments,
  due_date       date,
  photo_before   text not null,
  stop6          text check (stop6 in ('A','B','C','D','E','F','O')),
  severity       smallint check (severity in (2,6,12)),
  frequency      smallint check (frequency in (3,4,5)),
  probability    smallint check (probability in (1,4,8)),
  score          smallint generated always as (severity + frequency + probability) stored,
  rank           char(1) generated always as (risk_rank(severity + frequency + probability)) stored,
  kaizen        text[] check (cardinality(kaizen) > 0 and kaizen <@ array['eliminasi','substitusi','modifikasi','admin','apd']),
  five_r         smallint check (five_r between 1 and 5),
  sqcdm          text[] check (cardinality(sqcdm) > 0 and sqcdm <@ array['S','Q','C','D','M']),
  created_by     bigint not null references users,
  created_at     timestamptz not null default now(),
  check (type <> 'safety' or (stop6 is not null and score is not null and five_r is null and sqcdm is null)),
  check (type <> '5s'     or (five_r is not null and sqcdm is not null and stop6 is null and kaizen is null
                              and severity is null and frequency is null and probability is null))
);

-- After: poin dinilai ulang oleh PIC. Wajib untuk Safety, kosong untuk 5S (dicek di PatrolController,
-- karena CHECK tidak bisa membaca findings.type).
create table resolutions (
  finding_id        bigint primary key references findings on delete cascade,
  photo_after       text not null,
  severity_after    smallint check (severity_after in (2,6,12)),
  frequency_after   smallint check (frequency_after in (3,4,5)),
  probability_after smallint check (probability_after in (1,4,8)),
  score_after       smallint generated always as (severity_after + frequency_after + probability_after) stored,
  rank_after        char(1) generated always as (risk_rank(severity_after + frequency_after + probability_after)) stored,
  closed_by         bigint not null references users,
  closed_at         timestamptz not null default now(),
  check ((severity_after is null) = (frequency_after is null) and (frequency_after is null) = (probability_after is null))
);

create view v_findings as
select f.*,
       'TRF-' || lpad(f.id::text, 3, '0') as code,
       case when r.finding_id is null then 'open' else 'closed' end as status,
       r.closed_at,
       r.photo_after,
       r.score_after,
       r.rank_after,
       r.closed_by
from findings f
left join resolutions r on r.finding_id = f.id;
SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
drop view v_findings;
drop table resolutions, findings;
alter table users drop column dept_id, drop column role, drop column active;
drop table areas, departments;
drop function risk_rank;
SQL);
    }
};
