<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Nama auditor yang diketik di form ("yudha,alex,ade"), hanya untuk kolom AUDITOR di Excel.
// Boleh null untuk temuan lama (Excel memakai nama akun pembuat). Wajib untuk temuan baru dicek di controller.
// View dibuat ulang karena f.* di view tidak ikut bertambah sendiri.
return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
drop view v_findings;
alter table findings add column auditors text[] check (cardinality(auditors) > 0 and array_position(auditors, '') is null);
create view v_findings as
select f.*,
       'TRF-' || lpad(f.id::text, 3, '0') as code,
       case when r.finding_id is null then 'open' else 'closed' end as status,
       r.closed_at, r.photo_after, r.score_after, r.rank_after, r.closed_by
from findings f
left join resolutions r on r.finding_id = f.id;
SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
drop view v_findings;
alter table findings drop column auditors;
create view v_findings as
select f.*,
       'TRF-' || lpad(f.id::text, 3, '0') as code,
       case when r.finding_id is null then 'open' else 'closed' end as status,
       r.closed_at, r.photo_after, r.score_after, r.rank_after, r.closed_by
from findings f
left join resolutions r on r.finding_id = f.id;
SQL);
    }
};
