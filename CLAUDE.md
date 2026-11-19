# Sistem Informasi Safety Patrol & 5S/5R — PT Yahata Fastener Indonesia (YFI)

Sistem BARU (bukan lanjutan Laravel `mkm_safetyassessment`, itu hanya acuan fitur).
Pengganti Excel patroli. Pengguna menandai temuan (Before), departemen terkait menutupnya (After).

## Cara kerja dengan pemilik proyek
- Jelaskan dulu, tunggu persetujuan sebelum implementasi besar. Pemilik ingin paham konsepnya.
- Gaya `/ponytail`: solusi paling sedikit kode, stdlib/native dulu, tanpa abstraksi spekulatif.
- Jawaban singkat dan terstruktur, bahasa Indonesia. Koreksi satu hal per langkah.

## Stack
React (Vite) + Tailwind + Supabase (Postgres, Auth, Storage). Tanpa backend sendiri; akses diatur RLS.
Windows: `vite build` butuh `@rolldown/binding-win32-x64-msvc` (optionalDependency). `npm run lint` gagal karena binding native, bukan karena kode.

## Keputusan FINAL (jangan dibuka lagi tanpa diminta)
- Satu akun per orang, punya satu departemen. Orang yang sama bisa jadi Auditor (buat temuan) dan PIC (tutup temuan departemennya). Tidak ada role terpisah; ada `is_admin`.
- Dua jenis temuan: `safety` dan `5s`. Auditor = akun yang login (otomatis). Tidak ada tabel tim patroli.
- Rank Safety dipilih manual A/B/C (tanpa skor 3 faktor). Rank After wajib untuk Safety.
- 4M, SQCDM, dan Saran Kaizen: BOLEH LEBIH DARI SATU (kolom `text[]`, minimal satu; kaizen boleh null). 5R, STOP 6, Rank: satu pilihan. 5R = R1..R5 (R3 = Resik). STOP 6 = A,B,C,D,E,F,O.
- Saran Kaizen (Eliminasi/Substitusi/Modifikasi/Admin/APD): di tahap BEFORE, opsional, hanya Safety.
- 5S After punya "Tindakan Pencegahan" (`preventive`, opsional). Safety After tidak.
- Due date OPSIONAL (fleksibel), tanpa default.
- Status hanya Open/Closed. Closed begitu PIC mengirim form After; tanpa verifikasi.
- Area = dropdown datar. TIDAK ada laporan QR publik tanpa login. Foto Before dan After wajib (bucket `attachments`, private).

## Database (SUDAH jalan dan teruji di project Supabase pemilik)
File yang berlaku, simpan di `supabase/`:
- `schema.sql`: tabel `departments, areas, profiles, findings, resolutions`, view `v_findings` (status dan kode `TRF-001` dihitung), RLS, bucket `attachments`.
- `02_data_master.sql`: departemen, area (contoh), daftar user. Edit daftar `daftar_user` di dalamnya.
- `03_uji_alur.sql`: uji RLS dan aturan Before/After (22 uji, versi array). Output berupa ERROR disengaja (membatalkan data uji).
- `04_multi_pilihan.sql`: migrasi sekali jalan, `four_m`/`sqcdm`/`kaizen` jadi `text[]`. `schema.sql` sudah memuat versi array untuk database baru.
- JANGAN jalankan `local-shim.sql` di Supabase (hanya untuk Postgres lokal).
USANG, jangan dipakai: `schema.sql` versi lama (dengan skor 3 faktor, `patrol_members`, `audits_5s`, `v_rekap`), `departments.sql`, `seed-users.mjs` (membuat 8 akun per departemen; modelnya sekarang akun per orang).

Aturan data (sudah di database, jangan diulang di frontend sebagai satu-satunya penjaga):
- `findings`: Safety wajib `stop6`+`rank`, dilarang `five_r`/`sqcdm`. 5S wajib `five_r`+`sqcdm`, dilarang `stop6`/`rank`/`kaizen`.
- `resolutions` (PK `finding_id`, jadi satu temuan hanya bisa ditutup sekali): Safety wajib `rank_after`, dilarang `preventive`. 5S dilarang `rank_after`.
- RLS: user melihat temuan miliknya atau yang `target_dept_id` = departemennya. Hanya PIC departemen tujuan yang boleh insert `resolutions`. User biasa tidak bisa update/delete. Admin bisa semua.

## Tema UI
Monokrom, mengikuti logo YFI (`public/logo.jpg`, hitam-putih): warna utama `gray-900`, tanpa hijau/biru/amber. Merah hanya untuk makna bahaya (Before, due, error). Logo dipakai di header, login, dan favicon.

## Frontend: acuan desain
`yfi_patrol_user_portal.tsx` (mockup, data tiruan; versi live sama persis). Layar: HOME, CREATE (tab Safety/5S), TASK_LIST, RESOLVE.

Yang harus diubah dari mockup agar sesuai database:
1. Ganti data tiruan dengan Supabase: login, profil (nama, departemen), dropdown dari `areas` dan `departments`, daftar tugas dari `v_findings` (departemen sendiri, `status='open'`).
2. Simpan nilai kode, bukan kalimat panjang: `four_m` (man/machine/material/method), `kaizen` (eliminasi/substitusi/modifikasi/admin/apd), `five_r` 1..5, `sqcdm` S/Q/C/D/M. Label tampilan dipetakan di frontend.
3. Tambah opsi `O - Other` di STOP 6.
4. Form Before Safety: tambah dropdown Saran Kaizen (opsional). Due date tidak wajib (hapus validasi `!dueDate`); tampilkan "-" bila kosong.
5. Form After: Safety = radio Rank After (wajib) + deskripsi + foto, TANPA kaizen. 5S = tindakan pencegahan (opsional) + deskripsi + foto.
6. Perbaiki bug mockup: label `Due:` di daftar tugas memakai tanggal dibuat (harus `due_date`); `handleResolveSubmit` hanya mengubah status (harus insert ke `resolutions`); ID dibuat dari `findings.length+1` (biarkan database); tombol foto belum berfungsi dan "WAJIB" belum dicek.
7. Upload foto ke bucket `attachments`, simpan path-nya di `photo_before` / `photo_after`. Kebijakan storage BELUM teruji; uji saat membangun. Tampilkan lewat signed URL.

Urutan bangun yang disarankan: login+profil -> dropdown master -> buat temuan (+foto) -> daftar tugas -> tutup temuan (+foto) -> layar admin.

Status: user portal (login s.d. tutup temuan) SUDAH dibangun di `src/` (App, pages/Portal|CreateForm|TaskList|ResolveForm, ui.jsx = label kode + komponen form, supabase.js = `insertWithPhoto`). Menunggu uji menyeluruh oleh pemilik. Router dihapus; layar pindah lewat state seperti mockup.

## Belum dibangun / belum diputuskan
- Layar admin: Laporan Keseluruhan, Grafik (per departemen, tren bulanan, persentase selesai, distribusi kategori; cukup dihitung dari `findings`+`resolutions`), Jadwal Mingguan (butuh tabel `schedules`, rancang bersama pemilik).
- Fitur ganti password belum ada. Export belum ada.
- Kode `TRF-00x` bisa melompat (identity tetap terpakai saat insert gagal); hanya label tampilan.
