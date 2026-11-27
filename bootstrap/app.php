<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
        // Aturan isian dijaga CHECK/PK di database. Tolakannya dijadikan pesan yang bisa dibaca user.
        $exceptions->render(function (QueryException $e) {
            $msg = match ($e->getCode()) {
                '23505' => match (true) {
                    str_contains($e->getMessage(), 'resolutions_pkey') => 'Temuan ini sudah ditutup.',   // satu temuan hanya ditutup sekali
                    str_contains($e->getMessage(), 'users_nik_key') => 'NIK sudah dipakai akun lain.',
                    default => 'Nama atau email sudah dipakai.',      // users.email, areas.name, departments.name
                },
                '23503' => str_starts_with($e->getSql(), 'delete')        // hapus data yang masih dirujuk
                    ? 'Tidak bisa dihapus: masih dipakai temuan atau akun. Nonaktifkan atau ganti nama saja.'
                    : 'Isian belum lengkap atau tidak sesuai.',
                '23502', '23514', '22P02' => 'Isian belum lengkap atau tidak sesuai.',
                default => null,
            };

            return $msg ? response()->json(['message' => $msg], 422) : null;
        });
    })->create();
