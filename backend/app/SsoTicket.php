<?php

namespace App;

use Illuminate\Support\Facades\Cache;

// Tiket SSO dari Superapps. Format (HARUS sama persis dengan pembuat tiket di Superapps):
//   tiket = B . "." . hex( HMAC-SHA256(B, SSO_SECRET) )
//   B     = base64url( "<nik>|<exp>" ), exp = detik unix (UTC), tanpa padding "="
// Dikirim browser ke /sso#tiket=<tiket> (setelah "#", jadi tidak tercatat di log server).
class SsoTicket
{
    const MAX_TTL = 120;   // tiket yang berlaku lebih dari 2 menit ke depan ditolak

    // Pembuat tiket. Di sistem ini hanya untuk uji (php artisan sso:tiket) dan contoh bagi Superapps.
    public static function make(string $nik, int $ttl = 60): string
    {
        $b = rtrim(strtr(base64_encode($nik.'|'.(time() + $ttl)), '+/', '-_'), '=');

        return $b.'.'.hash_hmac('sha256', $b, self::secret());
    }

    // NIK bila tiket sah, belum kedaluwarsa, dan belum pernah dipakai. Selain itu null.
    public static function nik(string $tiket): ?string
    {
        [$b, $sig] = explode('.', $tiket, 2) + [1 => ''];
        if (! hash_equals(hash_hmac('sha256', $b, self::secret()), $sig)) {
            return null;
        }
        [$nik, $exp] = explode('|', (string) base64_decode(strtr($b, '-_', '+/')), 2) + [1 => ''];
        $left = (int) $exp - time();
        if ($nik === '' || ! ctype_digit($exp) || $left < 0 || $left > self::MAX_TTL) {
            return null;
        }

        // Sekali pakai: tiket yang bocor (riwayat browser, tangkapan layar) tidak bisa dipakai ulang.
        return Cache::add("sso:$sig", true, $left + 1) ? $nik : null;
    }

    private static function secret(): string
    {
        $k = (string) config('services.sso.secret');
        abort_if(strlen($k) < 32, 503, 'SSO belum dikonfigurasi (SSO_SECRET di .env, minimal 32 karakter).');

        return $k;
    }
}
