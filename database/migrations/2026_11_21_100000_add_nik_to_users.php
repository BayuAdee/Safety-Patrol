<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// NIK karyawan: kunci masuk lewat Superapps (SSO) dan bisa dipakai login biasa.
// Boleh kosong (akun lama / akun layanan), tapi bila diisi harus unik dan tanpa spasi di tepi.
return new class extends Migration
{
    public function up(): void
    {
        DB::statement("alter table users add column nik text unique check (nik <> '' and nik = btrim(nik))");
    }

    public function down(): void
    {
        DB::statement('alter table users drop column nik');
    }
};
