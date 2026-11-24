<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\SsoTicket;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

// Semua endpoint aplikasi. Aturan akses (siapa melihat/menutup temuan) dicek di sini.
// Tidak ada endpoint ubah/hapus: user biasa memang tidak boleh mengubah data.
class PatrolController extends Controller
{
    public function login(Request $r)
    {
        // Satu kolom isian: ada "@" = email, selain itu = NIK.
        $id = trim((string) $r->input('login'));
        $u = User::where(str_contains($id, '@') ? 'email' : 'nik', $id)->first();
        abort_unless($u && Hash::check((string) $r->input('password'), $u->password), 422, 'NIK/email atau password salah.');
        abort_unless($u->active, 422, 'Akun dinonaktifkan. Hubungi superadmin.');

        return ['token' => $u->createToken('web')->plainTextToken];
    }

    // Masuk dari Superapps tanpa password: tiket berisi NIK (lihat app/SsoTicket.php).
    // Superapps menentukan BOLEH MASUK; di sini hanya akun ber-NIK yang aktif yang diterima, tanpa buat akun otomatis.
    public function sso(Request $r)
    {
        $nik = SsoTicket::nik((string) $r->input('tiket'));
        abort_unless($nik, 422, 'Tiket masuk tidak sah, kedaluwarsa, atau sudah dipakai. Buka lagi dari Superapps.');
        $u = User::where('nik', $nik)->where('active', true)->first();
        abort_unless($u, 422, "NIK $nik belum terdaftar atau akunnya nonaktif di sistem ini. Hubungi admin.");

        return ['token' => $u->createToken('sso')->plainTextToken];
    }

    public function logout(Request $r)
    {
        $r->user()->currentAccessToken()->delete();

        return response()->noContent();
    }

    public function me(Request $r)
    {
        $u = $r->user();

        return [
            'name' => $u->name, 'role' => $u->role, 'is_admin' => $u->is_admin, 'dept_id' => $u->dept_id,
            'departments' => $u->dept_id ? ['name' => DB::table('departments')->where('id', $u->dept_id)->value('name')] : null,
        ];
    }

    // Dropdown dan nama untuk Excel. Semua yang login boleh baca.
    public function master()
    {
        $get = fn ($t) => DB::table($t)->orderBy('name')->get(['id', 'name']);

        return ['areas' => $get('areas'), 'departments' => $get('departments'), 'profiles' => $get('users')];
    }

    // Tugas = temuan Open untuk departemen sendiri. Admin: semua temuan (Open dulu, lalu Closed), hanya melihat.
    public function tasks(Request $r)
    {
        $order = 'f.due_date nulls last, f.created_at';
        if ($r->user()->is_admin) {
            return $this->list($r, '', [], "f.status desc, $order"); // 'open' > 'closed'
        }

        return $this->list($r, "and f.status = 'open' and f.target_dept_id = ?", [$r->user()->dept_id], $order);
    }

    // Rekap: temuan dalam rentang created_at [from, to).
    public function findings(Request $r)
    {
        $r->validate(['from' => 'required|date', 'to' => 'required|date']);

        return $this->list($r, 'and f.created_at >= ? and f.created_at < ?', [$r->from, $r->to], 'f.created_at');
    }

    // Admin/superadmin hanya memantau, tidak membuat temuan.
    public function storeFinding(Request $r)
    {
        abort_if($r->user()->is_admin, 403, 'Admin tidak membuat temuan.');
        $r->validate(['photo' => 'required|image|max:10240']);
        $arr = fn ($k) => $this->pgArray($r->input($k));
        // "yudha, alex,,ade" -> {yudha,alex,ade}
        $auditors = array_values(array_filter(array_map('trim', explode(',', (string) $r->auditors)), 'strlen'));
        abort_unless($auditors, 422, 'Isi Nama Auditor (pisahkan dengan koma).');

        $this->insertWithPhoto($r, 'findings', 'photo_before', [
            'type' => $r->type, 'area_id' => $r->area_id, 'four_m' => $arr('four_m'), 'description' => $r->description,
            'target_dept_id' => $r->target_dept_id, 'due_date' => $r->due_date,
            'stop6' => $r->stop6, 'severity' => $r->severity, 'frequency' => $r->frequency, 'probability' => $r->probability,
            'kaizen' => $arr('kaizen'),
            'five_r' => $r->five_r, 'sqcdm' => $arr('sqcdm'),
            'auditors' => $this->pgArray($auditors), 'created_by' => $r->user()->id,
        ]);

        return response()->noContent();
    }

    // Tutup temuan (After): hanya PIC departemen tujuan. Admin/superadmin hanya memantau.
    // Ditutup dua kali = primary key bentrok, dijawab "sudah ditutup" (bootstrap/app.php).
    public function storeResolution(Request $r)
    {
        $r->validate(['finding_id' => 'required|integer', 'photo' => 'required|image|max:10240']);
        $u = $r->user();
        $type = $u->is_admin ? null : DB::table('findings')->where('id', $r->finding_id)->where('target_dept_id', $u->dept_id)->value('type');
        abort_unless($type, 403, 'Hanya PIC departemen tujuan yang boleh menutup temuan ini.');

        // Safety: poin After wajib (nilainya dijaga CHECK). 5S: tanpa poin.
        $poin = ['severity_after', 'frequency_after', 'probability_after'];
        $safety = $type === 'safety';
        abort_if($safety && ! $r->filled($poin), 422, 'Isi Keparahan, Frekuensi, dan Kemungkinan (After).');

        $this->insertWithPhoto($r, 'resolutions', 'photo_after', [
            'finding_id' => $r->finding_id, 'closed_by' => $u->id,
            ...array_fill_keys($poin, null), ...($safety ? $r->only($poin) : []),
        ]);

        return response()->noContent();
    }

    // Foto privat di storage/app/private. Semua yang login boleh melihat.
    public function photo(string $path)
    {
        abort_unless(Storage::exists($path), 404);

        return Storage::response($path);
    }

    // Terlihat: milik sendiri, ditujukan ke departemen sendiri, atau admin.
    // Postgres yang menyusun JSON, jadi kolom array (four_m dll) langsung jadi array JSON.
    private function list(Request $r, string $where, array $bind, string $order)
    {
        $u = $r->user();
        [$see, $seeBind] = $u->is_admin ? ['true', []] : ['(f.created_by = ? or f.target_dept_id = ?)', [$u->id, $u->dept_id]];
        // closer = yang menutup + departemennya (null bila masih Open).
        $sql = "select f.*, json_build_object('name', a.name) as areas, (select name from departments where id = f.target_dept_id) as target_dept,
                       case when cu.id is not null then json_build_object('name', cu.name, 'dept', cd.name) end as closer
                from v_findings f join areas a on a.id = f.area_id
                left join users cu on cu.id = f.closed_by left join departments cd on cd.id = cu.dept_id
                where $see $where order by $order";
        $json = DB::selectOne("select coalesce(json_agg(t), '[]') as j from ($sql) t", [...$seeBind, ...$bind])->j;

        return response($json, 200, ['Content-Type' => 'application/json']);
    }

    // Foto disimpan dulu; bila insert ditolak database, foto dihapus lagi agar tidak jadi sampah.
    private function insertWithPhoto(Request $r, string $table, string $col, array $row): void
    {
        $path = $r->file('photo')->store($table);
        try {
            DB::transaction(fn () => DB::table($table)->insert([...$row, $col => $path]));
        } catch (\Throwable $e) {
            Storage::delete($path);
            throw $e;
        }
    }

    // ['man','method'] -> '{"man","method"}' (literal array Postgres, tetap dikirim sebagai parameter).
    private function pgArray($v): ?string
    {
        if (! is_array($v) || ! $v) {
            return null;
        }

        return '{'.implode(',', array_map(fn ($x) => '"'.addcslashes((string) $x, '"\\').'"', $v)).'}';
    }
}
