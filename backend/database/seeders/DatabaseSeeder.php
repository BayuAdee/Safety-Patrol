<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

// Departemen, area, dan akun. Aman dijalankan berulang: php artisan db:seed
// Semua akun memakai password awal SEED_PASSWORD dari .env.
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $password = env('SEED_PASSWORD') ?: throw new \RuntimeException('Isi SEED_PASSWORD di .env (password awal semua akun).');

        $rows = fn (array $names) => array_map(fn ($n) => ['name' => $n], $names);
        DB::table('departments')->insertOrIgnore($rows([
            'Sales & Marketing', 'Purchasing', 'Produksi', 'Maintenance', 'HRGA', 'Quality', 'PPIC', 'Engineering',
        ]));
        // Area dari "Schejule Safety Patrol 2026.xlsx" kolom Area Safety Patrol (18 unik) + 1 tambahan. Typo Excel dibetulkan: METING -> MEETING, SUBCOUNT -> SUBCONT.
        DB::table('areas')->insertOrIgnore($rows([
            'PLANT 2 BAGIAN DEPAN', 'PLANT 2 BAGIAN BELAKANG', 'GUDANG OLI DAN FORMING AREA BELAKANG', 'FORMING AREA DEPAN',
            'TAPPING BELAKANG', 'TAPPING DEPAN', 'VISUAL CHECK', 'ROLLING', 'OFFICE LANTAI 1', 'RUANG MEETING, GUDANG, TOILET LANTAI 2',
            'OUTGOING CUSTOMER, RACK STORE AREA', 'INCOMING SUBCONT, FORKLIFT AREA', 'POS 1 SECURITY, LOBBY DEPAN',
            'PARKIR MOBIL DEPAN, GARDU PLN', 'POS 2 SECURITY, PARKIR MOTOR', 'DEPAN GEDUNG PLANT 2, KANTIN BELAKANG', 'DEPAN TPS', 'SAMPING PLANT 2',
            'WORKSHOP AREA, GRINDING', // tambahan di luar Excel
        ]));

        // Akun awal: superadmin, admin, dan 2 akun CONTOH per departemen (produksi1@, produksi2@, ...).
        // Nama dan NIK asli diisi superadmin lewat menu Kelola.
        // NIK uji HARUS sama dengan seeder Superapps (SSO mencocokkan NIK): 900 + nomor departemen + 1/2.
        $nomor = ['Engineering' => 1, 'HRGA' => 2, 'Maintenance' => 3, 'PPIC' => 4, 'Produksi' => 5, 'Purchasing' => 6, 'Quality' => 7, 'Sales & Marketing' => 8];
        $akun = [
            ['superadmin@contoh.com', 'Superadmin', null, 'superadmin', '90000'],
            ['admin@contoh.com', 'Admin', null, 'admin', '90100'],
        ];
        foreach (DB::table('departments')->orderBy('id')->get() as $d) {
            $slug = preg_replace('/[^a-z]/', '', strtolower($d->name));
            foreach ([1, 2] as $n) {
                $akun[] = ["$slug$n@contoh.com", "{$d->name} $n", $d->id, 'user', isset($nomor[$d->name]) ? "900{$nomor[$d->name]}$n" : null];
            }
        }
        foreach ($akun as [$email, $name, $dept, $role, $nik]) {
            User::updateOrCreate(['email' => $email], ['name' => $name, 'nik' => $nik, 'password' => $password, 'dept_id' => $dept, 'role' => $role]);
        }
    }
}
