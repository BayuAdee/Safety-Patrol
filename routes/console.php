<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Uji SSO tanpa Superapps: php artisan sso:tiket 12345  lalu buka alamat yang dicetak.
Artisan::command('sso:tiket {nik} {--url=http://localhost:5173}', function (string $nik) {
    $this->line($this->option('url').'/sso#tiket='.App\SsoTicket::make($nik));
    $this->comment('Berlaku 60 detik, sekali pakai.');
})->purpose('Buat tiket SSO uji untuk NIK tertentu');
