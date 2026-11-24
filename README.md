# Sistem Informasi Safety Patrol & 5S/5R — PT Yahata Fastener Indonesia

Pencatatan temuan patroli Safety dan 5S/5R (Before), penutupan oleh departemen terkait (After, foto),
serta rekap per semester dan export Excel untuk admin.
Stack: React (Vite) + Tailwind (frontend, folder utama) + Laravel + PostgreSQL (backend, folder `backend/`).

## Kebutuhan
- Node.js 20.19+ / 22.12+
- PHP 8.3+ dengan ekstensi `pdo_pgsql`, `pgsql`, `zip` (mis. dari Laragon) dan Composer
- PostgreSQL 16

## Menjalankan di laptop

Backend (sekali di awal):
```
cd backend
composer install
copy .env.example .env      (atau minta file .env ke pemilik proyek)
php artisan key:generate
```
Isi di `backend/.env`: `DB_CONNECTION=pgsql`, `DB_DATABASE=safety_patrol`, `DB_USERNAME`, `DB_PASSWORD`,
dan `SEED_PASSWORD` (password awal semua akun). Buat database `safety_patrol` di PostgreSQL, lalu:
```
php artisan migrate
php artisan db:seed
php artisan db:seed --class=ContohSeeder   (opsional, 16 temuan contoh)
```

Setiap kali bekerja, jalankan dua terminal:
```
cd backend && php artisan serve     (API, port 8000)
npm install && npx vite --host      (tampilan; buka alamat yang tampil)
```

Akun dan departemen diatur di `backend/database/seeders/DatabaseSeeder.php`.

## Uji
```
cd backend && php artisan test      (butuh database safety_patrol_test)
node src/rekap.test.js
node src/xlsx.test.js
```
