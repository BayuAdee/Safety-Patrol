<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Kaizen (teks bebas), Safety dan 5S. Boleh null untuk temuan lama; wajib untuk temuan baru dicek di controller.
// View dibuat ulang karena f.* di view tidak ikut bertambah sendiri.
return new class extends Migration
{
    private const VIEW = <<<'SQL'
create view v_findings as
select f.*,
       'TRF-' || lpad(f.id::text, 3, '0') as code,
       case when r.finding_id is null then 'open' else 'closed' end as status,
       r.closed_at, r.photo_after, r.score_after, r.rank_after, r.closed_by
from findings f
left join resolutions r on r.finding_id = f.id;
SQL;

    public function up(): void
    {
        DB::unprepared("drop view v_findings;
alter table findings add column kaizen_note text check (btrim(kaizen_note) <> '');
".self::VIEW);
    }

    public function down(): void
    {
        DB::unprepared('drop view v_findings; alter table findings drop column kaizen_note; '.self::VIEW);
    }
};
