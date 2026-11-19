-- 03_uji_alur.sql
-- Menguji alur Before/After dan RLS memakai akun contoh dari 02_data_master.sql.
-- Semua data uji DIBATALKAN otomatis. Hasil muncul sebagai pesan ERROR (disengaja, supaya
-- transaksi dibatalkan). Baca baris yang berawalan LULUS / GAGAL. Semua harus LULUS.

create or replace function pg_temp.as_user(p_email text) returns void language plpgsql as $$
declare v_id text;
begin
  reset role;
  select id::text into v_id from auth.users where email = p_email;
  if v_id is null then raise exception 'akun % belum dibuat', p_email; end if;
  perform set_config('request.jwt.claim.sub', v_id, true);
  perform set_config('request.jwt.claims',
         json_build_object('sub', v_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
end $$;

-- Jalankan perintah, kembalikan 'OK' atau 'DITOLAK (alasan)'.
create or replace function pg_temp.try(p_sql text) returns text language plpgsql as $$
begin execute p_sql; return 'OK';
exception when others then return 'DITOLAK (' || sqlerrm || ')'; end $$;

-- Jalankan perintah, kembalikan jumlah baris yang terlihat/terubah.
create or replace function pg_temp.n(p_sql text) returns text language plpgsql as $$
declare c bigint;
begin execute p_sql; get diagnostics c = row_count; return c || ' baris'; end $$;

-- Bandingkan hasil dengan harapan.
create or replace function pg_temp.cek(p_judul text, p_harap text, p_hasil text) returns text language sql as $$
  select case when p_hasil like p_harap || '%' then 'LULUS  ' else 'GAGAL  ' end
         || rpad(p_judul, 62) || ' => ' || p_hasil || E'\n' $$;

do $$
declare o text := '';
  v_budi uuid := (select id from auth.users where email = 'budi@contoh.com');
begin
  -- ===== Before =====
  perform pg_temp.as_user('andi@contoh.com');
  o := o || pg_temp.cek('Andi (Produksi) buat Safety ke Maintenance', 'OK', pg_temp.try($q$
    insert into findings(type,area_id,four_m,description,target_dept_id,photo_before,stop6,rank,kaizen)
    values ('safety',(select id from areas order by id limit 1),'{machine,man}','[UJI] Kabel terkelupas',
            (select id from departments where name='Maintenance'),'uji/1.jpg','E','A','{modifikasi,apd}') $q$));
  o := o || pg_temp.cek('Andi buat 5S ke Quality (tanpa due date)', 'OK', pg_temp.try($q$
    insert into findings(type,area_id,four_m,description,target_dept_id,photo_before,five_r,sqcdm)
    values ('5s',(select id from areas order by id limit 1),'{method}','[UJI] Kardus halangi jalur',
            (select id from departments where name='Quality'),'uji/2.jpg',1,'{S,Q}') $q$));
  o := o || pg_temp.cek('4M kosong (tanpa pilihan)', 'DITOLAK', pg_temp.try($q$
    insert into findings(type,area_id,four_m,description,target_dept_id,photo_before,five_r,sqcdm)
    values ('5s',(select id from areas order by id limit 1),'{}','[UJI] x',
            (select id from departments where name='Quality'),'uji/6.jpg',1,'{S}') $q$));
  o := o || pg_temp.cek('SQCDM berisi kode tidak dikenal', 'DITOLAK', pg_temp.try($q$
    insert into findings(type,area_id,four_m,description,target_dept_id,photo_before,five_r,sqcdm)
    values ('5s',(select id from areas order by id limit 1),'{man}','[UJI] x',
            (select id from departments where name='Quality'),'uji/7.jpg',1,'{S,X}') $q$));
  o := o || pg_temp.cek('Safety tanpa rank', 'DITOLAK', pg_temp.try($q$
    insert into findings(type,area_id,four_m,description,target_dept_id,photo_before,stop6)
    values ('safety',(select id from areas order by id limit 1),'{man}','[UJI] x',
            (select id from departments where name='Maintenance'),'uji/3.jpg','D') $q$));
  o := o || pg_temp.cek('5S membawa kaizen', 'DITOLAK', pg_temp.try($q$
    insert into findings(type,area_id,four_m,description,target_dept_id,photo_before,five_r,sqcdm,kaizen)
    values ('5s',(select id from areas order by id limit 1),'{man}','[UJI] x',
            (select id from departments where name='Quality'),'uji/4.jpg',2,'{Q}','{apd}') $q$));
  o := o || pg_temp.cek('Buat temuan atas nama orang lain', 'DITOLAK', pg_temp.try($q$
    insert into findings(type,area_id,four_m,description,target_dept_id,photo_before,five_r,sqcdm,created_by)
    values ('5s',(select id from areas order by id limit 1),'{man}','[UJI] x',
            (select id from departments where name='Quality'),'uji/5.jpg',2,'{Q}',
            '$q$ || v_budi || $q$') $q$));

  -- ===== Siapa melihat apa =====
  o := o || pg_temp.cek('Andi (pembuat) melihat temuannya', '2 baris',
        pg_temp.n($q$ select * from v_findings where description like '[UJI]%' $q$));
  perform pg_temp.as_user('budi@contoh.com');
  o := o || pg_temp.cek('Budi (Maintenance) hanya melihat yang ditujukan ke dia', '1 baris',
        pg_temp.n($q$ select * from v_findings where description like '[UJI]%' $q$));
  perform pg_temp.as_user('citra@contoh.com');
  o := o || pg_temp.cek('Citra (Quality) hanya melihat yang ditujukan ke dia', '1 baris',
        pg_temp.n($q$ select * from v_findings where description like '[UJI]%' $q$));
  perform pg_temp.as_user('hadi@contoh.com');
  o := o || pg_temp.cek('Hadi (Sales) tidak melihat apa pun', '0 baris',
        pg_temp.n($q$ select * from v_findings where description like '[UJI]%' $q$));

  -- ===== After =====
  perform pg_temp.as_user('andi@contoh.com');
  o := o || pg_temp.cek('Andi (bukan PIC Maintenance) mencoba menutup', 'DITOLAK', pg_temp.try($q$
    insert into resolutions(finding_id,description,photo_after,rank_after)
    values ((select id from findings where description='[UJI] Kabel terkelupas'),'x','uji/a.jpg','B') $q$));
  perform pg_temp.as_user('budi@contoh.com');
  o := o || pg_temp.cek('Budi tutup Safety tanpa rank_after', 'DITOLAK', pg_temp.try($q$
    insert into resolutions(finding_id,description,photo_after)
    values ((select id from findings where description='[UJI] Kabel terkelupas'),'Kabel dibungkus','uji/b.jpg') $q$));
  o := o || pg_temp.cek('Budi tutup Safety dengan rank_after', 'OK', pg_temp.try($q$
    insert into resolutions(finding_id,description,photo_after,rank_after)
    values ((select id from findings where description='[UJI] Kabel terkelupas'),'Kabel dibungkus','uji/b.jpg','C') $q$));
  o := o || pg_temp.cek('Budi menutup temuan yang sama dua kali', 'DITOLAK', pg_temp.try($q$
    insert into resolutions(finding_id,description,photo_after,rank_after)
    values ((select id from findings where description='[UJI] Kabel terkelupas'),'dobel','uji/b2.jpg','C') $q$));
  perform pg_temp.as_user('citra@contoh.com');
  o := o || pg_temp.cek('Citra tutup 5S dengan rank_after (tidak boleh)', 'DITOLAK', pg_temp.try($q$
    insert into resolutions(finding_id,description,photo_after,rank_after)
    values ((select id from findings where description='[UJI] Kardus halangi jalur'),'x','uji/c.jpg','B') $q$));
  o := o || pg_temp.cek('Citra tutup 5S dengan tindakan pencegahan', 'OK', pg_temp.try($q$
    insert into resolutions(finding_id,description,photo_after,preventive)
    values ((select id from findings where description='[UJI] Kardus halangi jalur'),'Kardus dipindah','uji/c.jpg','Tambah rak') $q$));

  -- ===== Hak ubah =====
  perform pg_temp.as_user('budi@contoh.com');
  o := o || pg_temp.cek('Budi mengubah isi temuan', '0 baris',
        pg_temp.n($q$ update findings set description = description where description like '[UJI]%' $q$));
  perform pg_temp.as_user('andi@contoh.com');
  o := o || pg_temp.cek('Andi menjadikan dirinya admin', '0 baris',
        pg_temp.n($q$ update profiles set is_admin = true where id = auth.uid() $q$));
  o := o || pg_temp.cek('Andi melihat 2 temuannya berstatus closed', '2 baris',
        pg_temp.n($q$ select * from v_findings where status='closed' and description like '[UJI]%' $q$));

  -- ===== Admin =====
  perform pg_temp.as_user('admin@contoh.com');
  o := o || pg_temp.cek('Admin melihat semua temuan uji', '2 baris',
        pg_temp.n($q$ select * from v_findings where description like '[UJI]%' $q$));
  o := o || pg_temp.cek('Admin mengubah temuan', '2 baris',
        pg_temp.n($q$ update findings set description = description where description like '[UJI]%' $q$));

  reset role;
  raise exception E'\n===== HASIL UJI (ERROR ini disengaja; semua data uji sudah dibatalkan) =====\n%\nGAGAL: % dari %',
    o, (length(o) - length(replace(o, 'GAGAL', ''))) / 5, length(o) - length(replace(o, E'\n', ''));
end $$;
