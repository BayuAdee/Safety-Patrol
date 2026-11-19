-- 04_multi_pilihan.sql
-- 4M, SQCDM, dan Saran Kaizen boleh lebih dari satu pilihan: kolom diubah menjadi text[].
-- Jalankan SEKALI di SQL Editor pada database yang sudah memakai schema.sql versi satu pilihan.
-- Data lama dipertahankan ('man' -> {man}). Database baru cukup memakai schema.sql terbaru.

begin;

-- View bergantung pada kolom ini, jadi dilepas dulu lalu dibuat ulang (definisi sama).
drop view v_findings;

alter table findings
  drop constraint findings_four_m_check,
  drop constraint findings_kaizen_check,
  drop constraint findings_sqcdm_check,
  alter column four_m type text[] using array[four_m],
  alter column kaizen type text[] using case when kaizen is null then null else array[kaizen] end,
  alter column sqcdm  type text[] using case when sqcdm  is null then null else array[sqcdm::text] end,
  -- Minimal satu pilihan, dan hanya kode yang dikenal. kaizen tetap boleh null (opsional).
  add constraint findings_four_m_check check (cardinality(four_m) > 0 and four_m <@ array['man','machine','material','method']),
  add constraint findings_kaizen_check check (cardinality(kaizen) > 0 and kaizen <@ array['eliminasi','substitusi','modifikasi','admin','apd']),
  add constraint findings_sqcdm_check  check (cardinality(sqcdm)  > 0 and sqcdm  <@ array['S','Q','C','D','M']);

create view v_findings with (security_invoker = true) as
select f.*,
       'TRF-' || lpad(f.id::text, 3, '0') as code,
       case when r.finding_id is null then 'open' else 'closed' end as status,
       r.closed_at
from findings f
left join resolutions r on r.finding_id = f.id;

commit;
