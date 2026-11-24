<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

// Satu akun per orang, satu departemen, role user/admin/superadmin.
#[Fillable(['name', 'nik', 'email', 'password', 'dept_id', 'role', 'active'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory;

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'active' => 'boolean',
        ];
    }

    // NIK dirapikan: spasi di tepi dibuang, isian kosong = tanpa NIK (null).
    protected function nik(): Attribute
    {
        return Attribute::set(fn ($v) => ($v = trim((string) $v)) === '' ? null : $v);
    }

    // Admin dan superadmin: melihat semua temuan dan Rekap. Bukan kolom, dihitung dari role.
    protected function isAdmin(): Attribute
    {
        return Attribute::get(fn () => in_array($this->role, ['admin', 'superadmin'], true));
    }
}
