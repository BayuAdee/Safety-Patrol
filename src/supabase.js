import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)

export async function insertWithPhoto(table, form, photoCol, extra) {
  const fd = new FormData(form)
  const file = fd.get('photo')
  fd.delete('photo')
  if (!file?.size) throw new Error('Foto wajib diisi.')
  const row = { ...extra }
  for (const k of new Set(fd.keys())) {
    if (k.endsWith('[]')) row[k.slice(0, -2)] = fd.getAll(k)
    else row[k] = fd.get(k).trim() || null
  }

  // Bukan crypto.randomUUID: tidak tersedia saat dibuka lewat http://IP-LAN dari HP.
  const path = `${table}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${file.type.split('/')[1] || 'jpg'}`
  const up = await supabase.storage.from('attachments').upload(path, file, { contentType: file.type })
  if (up.error) throw up.error

  const { error } = await supabase.from(table).insert({ ...row, [photoCol]: path })
  if (error) throw error
}
