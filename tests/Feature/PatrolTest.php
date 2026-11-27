<?php

namespace Tests\Feature;

use App\Models\User;
use App\SsoTicket;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\PersonalAccessToken;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

// Uji aturan akses dan aturan isian (CHECK).
// Jalankan: php artisan test   (memakai database safety_patrol_test, lihat phpunit.xml)
class PatrolTest extends TestCase
{
    use DatabaseMigrations;

    private User $auditor;   // Produksi

    private User $pic;       // Maintenance (departemen tujuan)

    private User $lain;      // Quality (bukan pembuat, bukan tujuan)

    private array $safety;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake();
        $dept = fn ($n) => DB::table('departments')->insertGetId(['name' => $n]);
        [$prod, $mtc, $qa] = [$dept('Produksi'), $dept('Maintenance'), $dept('Quality')];
        $area = DB::table('areas')->insertGetId(['name' => 'Ruang Panel']);
        $this->auditor = User::factory()->create(['dept_id' => $prod]);
        $this->pic = User::factory()->create(['dept_id' => $mtc]);
        $this->lain = User::factory()->create(['dept_id' => $qa]);
        $this->safety = [
            'type' => 'safety', 'area_id' => $area, 'four_m' => ['machine'], 'description' => 'Kabel terkelupas',
            'target_dept_id' => $mtc, 'stop6' => 'E',
            'severity' => 12, 'frequency' => 5, 'probability' => 4, 'kaizen' => ['modifikasi'], 'due_date' => '', 'auditors' => ' yudha, alex,,ade ',
            'kaizen_note' => ' Pasang cover kabel ',
        ];
    }

    private function foto(): UploadedFile
    {
        return UploadedFile::fake()->image('foto.jpg');
    }

    private function buatTemuan(array $ubah = [])
    {
        Sanctum::actingAs($this->auditor);

        return $this->postJson('/api/findings', [...$this->safety, ...$ubah, 'photo' => $this->foto()]);
    }

    public function test_login(): void
    {
        $this->postJson('/api/login', ['login' => $this->pic->email, 'password' => 'salah'])->assertStatus(422);
        $this->postJson('/api/login', ['login' => $this->pic->email, 'password' => 'password'])->assertOk()->assertJsonStructure(['token']);
        $this->getJson('/api/tasks')->assertUnauthorized();
        $this->getJson('/api/foto/findings/x.jpg')->assertUnauthorized();
    }

    public function test_login_dengan_nik(): void
    {
        $this->pic->update(['nik' => ' 10023 ']);                                   // spasi di tepi dibuang
        $this->assertSame('10023', $this->pic->fresh()->nik);
        $this->postJson('/api/login', ['login' => '10023', 'password' => 'password'])->assertOk()->assertJsonStructure(['token']);
        $this->postJson('/api/login', ['login' => '10023', 'password' => 'salah'])
            ->assertStatus(422)->assertJsonPath('message', 'NIK/email atau password salah.');
        $this->postJson('/api/login', ['login' => '', 'password' => 'password'])->assertStatus(422);   // akun tanpa NIK tidak cocok dengan isian kosong
    }

    public function test_sso(): void
    {
        $this->withoutMiddleware(ThrottleRequests::class);   // uji ini mengirim > 10 tiket per menit
        config(['services.sso.secret' => str_repeat('k', 32)]);
        $this->pic->update(['nik' => '10023']);
        $sso = fn ($tiket) => $this->postJson('/api/sso', ['tiket' => $tiket]);
        $b64 = fn ($s) => rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
        $sign = fn ($b) => $b.'.'.hash_hmac('sha256', $b, str_repeat('k', 32));
        $tolak = 'Tiket masuk tidak sah, kedaluwarsa, atau sudah dipakai. Buka lagi dari Superapps.';

        $t = SsoTicket::make('10023');
        $token = $sso($t)->assertOk()->json('token');
        $this->assertSame($this->pic->id, PersonalAccessToken::findToken($token)->tokenable_id);
        $sso($t)->assertStatus(422)->assertJsonPath('message', $tolak);                        // sekali pakai

        $sso(substr(SsoTicket::make('10023'), 0, -1).'0')->assertStatus(422);                // tanda tangan diubah
        $sso($b64('10023|'.(time() + 60)).'.'.hash_hmac('sha256', $b64('10023|'.(time() + 60)), 'kunci-lain-kunci-lain-kunci-lain'))->assertStatus(422);
        $sso($sign($b64('10023|'.(time() - 1))))->assertStatus(422);                         // kedaluwarsa
        $sso($sign($b64('10023|'.(time() + 3600))))->assertStatus(422);                      // berlaku terlalu lama
        $sso($sign($b64('10023|abc')))->assertStatus(422);
        $sso('')->assertStatus(422);
        $sso('tanpa-titik')->assertStatus(422);

        $sso(SsoTicket::make('99999'))->assertStatus(422)                                   // NIK tidak terdaftar: tanpa buat akun
            ->assertJsonPath('message', 'NIK 99999 belum terdaftar atau akunnya nonaktif di sistem ini. Hubungi admin.');
        $this->assertSame(0, User::where('nik', '99999')->count());
        $this->pic->update(['active' => false]);
        $sso(SsoTicket::make('10023'))->assertStatus(422);                                  // akun nonaktif

        config(['services.sso.secret' => 'pendek']);
        $sso('x.y')->assertStatus(503);                                                      // kunci belum diatur = SSO mati
    }

    public function test_isian_dijaga_database(): void
    {
        $this->buatTemuan()->assertNoContent();
        $this->buatTemuan(['severity' => ''])->assertStatus(422);                 // Safety wajib 3 poin
        $this->buatTemuan(['severity' => 7])->assertStatus(422);                  // poin di luar 2/6/12
        $this->buatTemuan(['five_r' => 2])->assertStatus(422);                    // Safety dilarang 5R
        $this->buatTemuan(['four_m' => ['hacker']])->assertStatus(422);           // kode di luar daftar
        $limaS = ['type' => '5s', 'stop6' => '', 'kaizen' => null, 'five_r' => 3, 'sqcdm' => ['S', 'Q']];
        $this->buatTemuan([...$limaS, 'severity' => '', 'frequency' => '', 'probability' => ''])->assertNoContent();
        $this->buatTemuan($limaS)->assertStatus(422);                             // 5S dilarang poin
        $this->postJson('/api/findings', $this->safety)->assertStatus(422);       // tanpa foto
        $this->assertSame(2, DB::table('findings')->count());
        $this->assertCount(2, Storage::allFiles('findings'));                      // foto temuan yang ditolak ikut dihapus

        $f = DB::table('findings')->first();
        $this->assertSame($this->auditor->id, $f->created_by);                    // pembuat = akun login
        $this->assertSame('{yudha,alex,ade}', $f->auditors);                     // nama auditor dipecah per koma
        $this->buatTemuan(['auditors' => ' , '])->assertStatus(422);
        $this->assertSame('Pasang cover kabel', $f->kaizen_note);                // Kaizen teks wajib, dirapikan
        $this->buatTemuan(['kaizen_note' => '  '])->assertStatus(422);
        $this->assertSame('{machine}', $f->four_m);
        $this->assertNull($f->due_date);                                           // due date opsional
        $this->assertSame([21, 'A'], [$f->score, $f->rank]);                       // 12+5+4, dihitung database
        $rank = fn ($s) => DB::selectOne('select risk_rank(?) r', [$s])->r;
        $this->assertSame(['C', 'C', 'B', 'B', 'A', 'A'], array_map($rank, [6, 9, 10, 18, 19, 25]));
    }

    public function test_siapa_melihat_apa(): void
    {
        $this->buatTemuan();
        $range = '/api/findings?from=2000-01-01&to=2100-01-01';

        Sanctum::actingAs($this->pic);
        $this->getJson('/api/tasks')->assertJsonCount(1)->assertJsonPath('0.code', 'TRF-'.str_pad(DB::table('findings')->value('id'), 3, '0', STR_PAD_LEFT))
            ->assertJsonPath('0.four_m', ['machine'])->assertJsonPath('0.areas.name', 'Ruang Panel')->assertJsonPath('0.target_dept', 'Maintenance')->assertJsonPath('0.status', 'open');
        Sanctum::actingAs($this->auditor);
        $this->getJson($range)->assertJsonCount(1);                                // pembuat melihat miliknya
        $this->getJson('/api/tasks')->assertJsonCount(0);                          // tapi bukan tugasnya
        Sanctum::actingAs($this->lain);
        $this->getJson($range)->assertJsonCount(0);                                // departemen lain tidak melihat
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $this->getJson($range)->assertJsonCount(1);                                // admin melihat semua
        $this->postJson('/api/findings', [...$this->safety, 'photo' => $this->foto()])->assertForbidden(); // admin tidak membuat temuan
    }

    public function test_superadmin_kelola_akun_dan_master(): void
    {
        $baru = ['name' => 'Rina', 'email' => 'rina@contoh.com', 'password' => 'rahasia123', 'dept_id' => $this->pic->dept_id, 'role' => 'user'];

        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $this->getJson('/api/users')->assertForbidden();                            // admin bukan superadmin
        $this->postJson('/api/users', $baru)->assertForbidden();

        $super = User::factory()->create(['role' => 'superadmin']);
        Sanctum::actingAs($super);
        $this->postJson('/api/users', [...$baru, 'password' => 'pendek'])->assertStatus(422);
        $this->postJson('/api/users', [...$baru, 'dept_id' => null])->assertStatus(422);   // user wajib departemen
        $this->postJson('/api/users', $baru)->assertNoContent();
        $this->postJson('/api/users', $baru)->assertStatus(422)->assertJsonPath('message', 'Nama atau email sudah dipakai.');
        $this->postJson('/api/users', [...$baru, 'email' => 'rina2@contoh.com', 'nik' => '777'])->assertNoContent();
        $this->postJson('/api/users', [...$baru, 'email' => 'rina3@contoh.com', 'nik' => '777'])
            ->assertStatus(422)->assertJsonPath('message', 'NIK sudah dipakai akun lain.');
        $rina2 = User::where('email', 'rina2@contoh.com')->first();
        $this->patchJson("/api/users/$rina2->id", ['nik' => ''])->assertNoContent();          // kosong = hapus NIK
        $this->assertNull($rina2->fresh()->nik);
        $this->getJson('/api/users')->assertJsonFragment(['email' => 'rina2@contoh.com', 'nik' => null]);
        $rina = User::where('email', 'rina@contoh.com')->first();

        $this->patchJson("/api/users/$rina->id", ['password' => 'gantibaru1'])->assertNoContent();   // reset password
        $this->postJson('/api/login', ['login' => 'rina@contoh.com', 'password' => 'gantibaru1'])->assertOk();
        $rina->createToken('web');
        $this->patchJson("/api/users/$rina->id", ['active' => false])->assertNoContent();
        $this->assertSame(0, $rina->tokens()->count());                              // sesi berjalan diputus
        $this->postJson('/api/login', ['login' => 'rina@contoh.com', 'password' => 'gantibaru1'])
            ->assertStatus(422)->assertJsonPath('message', 'Akun dinonaktifkan. Hubungi superadmin.');
        $this->patchJson("/api/users/$super->id", ['active' => false])->assertStatus(422);   // tidak bisa mengunci diri sendiri

        $this->postJson('/api/master/areas', ['name' => 'Plant 2'])->assertNoContent();
        $this->postJson('/api/master/areas', ['name' => 'Plant 2'])->assertStatus(422);
        $id = DB::table('areas')->where('name', 'Plant 2')->value('id');
        $this->patchJson("/api/master/areas/$id", ['name' => 'Plant 2 - Heading'])->assertNoContent();
        $this->assertSame('Plant 2 - Heading', DB::table('areas')->where('id', $id)->value('name'));
        $this->postJson('/api/master/users', ['name' => 'x'])->assertNotFound();          // hanya areas/departments

        // Hapus: hanya yang belum dipakai.
        $this->deleteJson("/api/master/areas/$id")->assertNoContent();
        $this->assertNull(DB::table('areas')->find($id));
        $this->deleteJson('/api/master/departments/'.$this->pic->dept_id)->assertStatus(422)   // masih dipakai akun
            ->assertJsonPath('message', 'Tidak bisa dihapus: masih dipakai temuan atau akun. Nonaktifkan atau ganti nama saja.');
        $this->deleteJson("/api/users/$rina->id")->assertNoContent();
        $this->assertNull(User::find($rina->id));
        $this->deleteJson("/api/users/$super->id")->assertStatus(422);                  // tidak bisa menghapus diri sendiri
        $this->buatTemuan();
        Sanctum::actingAs($super);
        $this->deleteJson('/api/users/'.$this->auditor->id)->assertStatus(422);         // sudah membuat temuan
        $this->deleteJson('/api/master/areas/'.DB::table('findings')->value('area_id'))->assertStatus(422);
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $this->deleteJson("/api/master/areas/$id")->assertForbidden();                  // admin bukan superadmin
    }

    public function test_tutup_temuan(): void
    {
        $this->buatTemuan();
        $id = DB::table('findings')->value('id');
        $poin = ['severity_after' => 2, 'frequency_after' => 5, 'probability_after' => 1];
        $tutup = fn ($p = []) => $this->postJson('/api/resolutions', ['finding_id' => $id, ...$poin, ...$p, 'photo' => $this->foto()]);

        Sanctum::actingAs($this->auditor);
        $tutup()->assertForbidden();                                               // pembuat bukan PIC
        Sanctum::actingAs($this->lain);
        $tutup()->assertForbidden();
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);
        $tutup()->assertForbidden();                                               // admin hanya memantau
        Sanctum::actingAs($this->pic);
        $this->postJson('/api/resolutions', ['finding_id' => $id, ...$poin])->assertStatus(422);   // tanpa foto
        $tutup(['probability_after' => ''])->assertStatus(422);                    // Safety wajib poin After
        $tutup()->assertNoContent();
        $tutup()->assertStatus(422)->assertJsonPath('message', 'Temuan ini sudah ditutup.');

        $v = DB::table('v_findings')->first();
        $this->assertSame([8, 'C'], [$v->score_after, $v->rank_after]);           // 2+5+1
        $this->assertSame($this->pic->id, $v->closed_by);                          // nama yang memperbaiki
        $this->assertSame('closed', $v->status);
        $this->assertNotNull($v->closed_at);                                       // waktu tutup otomatis
        $this->getJson('/api/tasks')->assertJsonCount(0);
        $this->get('/api/foto/'.$v->photo_after)->assertOk();
        Sanctum::actingAs($admin);
        $this->getJson('/api/tasks')->assertJsonCount(1)->assertJsonPath('0.status', 'closed') // admin melihat yang Closed juga
            ->assertJsonPath('0.closer', ['name' => $this->pic->name, 'dept' => 'Maintenance']);   // siapa & departemen yang menutup
    }
}
