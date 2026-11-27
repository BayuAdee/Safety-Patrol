<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

// Kelola akun, area, dan departemen. Hanya superadmin (routes/api.php: can:superadmin).
// Hapus hanya bila belum dipakai (foreign key di database yang menolak, pesan di bootstrap/app.php).
// Yang sudah dipakai temuan lama: akun dinonaktifkan, area/departemen cukup diganti nama.
// Email/NIK/nama ganda, role salah, user tanpa departemen: ditolak database (pesan di bootstrap/app.php).
class SuperadminController extends Controller
{
    public function users()
    {
        return DB::table('users')->orderBy('name')->get(['id', 'name', 'nik', 'email', 'dept_id', 'role', 'active']);
    }

    public function storeUser(Request $r)
    {
        $this->check($r, true);
        User::create($r->only(['name', 'nik', 'email', 'password', 'dept_id', 'role']));

        return response()->noContent();
    }

    // Ubah sebagian: hanya field yang dikirim. Kirim password = reset password.
    public function updateUser(Request $r, User $user)
    {
        $this->check($r, false);
        abort_if($user->is($r->user()) && $r->hasAny(['role', 'active']), 422, 'Peran dan status akun sendiri tidak bisa diubah.');
        $user->update($r->only(['name', 'nik', 'email', 'password', 'dept_id', 'role', 'active']));
        if (! $user->active) {
            $user->tokens()->delete();   // nonaktif: sesi yang sedang berjalan ikut putus
        }

        return response()->noContent();
    }

    public function destroyUser(Request $r, User $user)
    {
        abort_if($user->is($r->user()), 422, 'Akun sendiri tidak bisa dihapus.');
        DB::transaction(function () use ($user) {
            $user->tokens()->delete();
            $user->delete();
        });

        return response()->noContent();
    }

    public function storeMaster(Request $r, string $table)
    {
        DB::table($table)->insert(['name' => $r->name]);

        return response()->noContent();
    }

    public function updateMaster(Request $r, string $table, int $id)
    {
        DB::table($table)->where('id', $id)->update(['name' => $r->name]);

        return response()->noContent();
    }

    public function destroyMaster(string $table, int $id)
    {
        DB::table($table)->where('id', $id)->delete();

        return response()->noContent();
    }

    private function check(Request $r, bool $new): void
    {
        $r->validate(['email' => 'sometimes|email'], ['email' => 'Format email tidak valid.']);
        abort_if(($new || $r->has('password')) && mb_strlen((string) $r->password) < 8, 422, 'Password minimal 8 karakter.');
    }
}
