// Buat 1 akun per departemen (role 'pic'). Jalankan SEKALI dari terminal Anda:
//   SUPABASE_URL=https://xxxx.supabase.co SERVICE_KEY=<service_role> DOMAIN=perusahaan.com node supabase/seed-users.mjs
// SERVICE_KEY hanya lewat env, jangan masuk .env.example / kode React. Password acak dicetak sekali; simpan.
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'

const { SUPABASE_URL, SERVICE_KEY, DOMAIN } = process.env
if (!SUPABASE_URL || !SERVICE_KEY || !DOMAIN) throw new Error('Isi SUPABASE_URL, SERVICE_KEY, DOMAIN')
const sb = createClient(SUPABASE_URL, SERVICE_KEY)

const { data: depts, error } = await sb.from('departments').select('id,name')
if (error) throw error

for (const d of depts) {
  const email = `${d.name.toLowerCase().replace(/[^a-z]+/g, '')}@${DOMAIN}`   // "Sales & Marketing" -> salesmarketing@
  const password = randomBytes(9).toString('base64url')
  const { data, error } = await sb.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { name: d.name },
  })
  if (error) { console.log(`SKIP ${email}: ${error.message}`); continue }
  // trigger on_signup sudah membuat baris profiles; tinggal isi role + departemen
  await sb.from('profiles').update({ role: 'pic', dept_id: d.id }).eq('id', data.user.id)
  console.log(`${d.name}\t${email}\t${password}`)
}
