-- 05_after_foto_saja.sql
-- Tahap After cukup foto. Deskripsi, Rank After, dan Tindakan Pencegahan dihapus.
-- Waktu tutup tetap otomatis di closed_at. Jalankan SEKALI di SQL Editor.
-- Database baru cukup memakai schema.sql terbaru.

begin;

-- Aman dijalankan berulang. cascade = trigger yang memakai fungsi ini ikut terhapus, apa pun namanya.
drop function if exists public.check_resolution() cascade;
alter table resolutions
  drop column if exists description,
  drop column if exists rank_after,
  drop column if exists preventive;

commit;
