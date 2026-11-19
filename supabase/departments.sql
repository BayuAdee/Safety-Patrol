-- Untuk database yang SUDAH menjalankan schema lama (PRD, QC, HRGA, PPIC). Aman dijalankan ulang.
-- PRD/QC di-rename (bukan dihapus) supaya data actions/profiles yang menunjuk ke sana tetap utuh.
update departments set name = 'Produksi' where name = 'PRD';
update departments set name = 'Quality'  where name = 'QC';
insert into departments(name) values
  ('Sales & Marketing'), ('Purchasing'), ('Produksi'), ('Maintenance'),
  ('HRGA'), ('Quality'), ('PPIC'), ('Engineering')
on conflict (name) do nothing;
