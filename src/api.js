// Semua data lewat API Laravel (folder backend/). Vite meneruskan /api ke Laravel.
const KEY = 'token'
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem(KEY)}` })

export async function api(path, { body, method = body ? 'POST' : 'GET' } = {}) {
  const form = body instanceof FormData
  const res = await fetch(`/api${path}`, {
    method,
    body: form ? body : body && JSON.stringify(body),
    headers: { Accept: 'application/json', ...auth(), ...(body && !form && { 'Content-Type': 'application/json' }) },
  })
  if (res.status === 204) return null
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `Server error (${res.status})`)
  return data
}

export const hasToken = () => !!localStorage.getItem(KEY)

// Satu-satunya pintu masuk. Produksi: isi VITE_SUPERAPPS_URL saat build (file .env di root).
// Dev: host yang sama dengan halaman ini (localhost di PC, IP PC di HP), port Superapps 5174.
export const SUPERAPPS = import.meta.env.VITE_SUPERAPPS_URL || `${location.protocol}//${location.hostname}:5174`

// Masuk dari Superapps. Token lama dibuang dulu: tiket gagal = keluar, bukan tetap memakai akun sebelumnya.
export async function loginSso(tiket) {
  localStorage.removeItem(KEY)
  const { token } = await api('/sso', { body: { tiket } })
  localStorage.setItem(KEY, token)
}

// Keluar dari sistem ini lalu kembali ke Superapps (sesi Superapps tetap, untuk memilih sistem lain).
export function logout() {
  api('/logout', { method: 'POST' }).catch(() => {}).finally(() => {
    localStorage.removeItem(KEY)
    location.href = SUPERAPPS
  })
}

// Perkecil foto di browser (canvas bawaan): sisi terpanjang maks `max` px, JPEG `quality`.
// Foto HP 12MP (2-5 MB) jadi sekitar 300-700 KB pada 1920px, masih tajam untuk dilihat dan di-zoom.
export async function toJpeg(blob, max = 1920, quality = 0.85) {
  const bmp = await createImageBitmap(blob)
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const c = Object.assign(document.createElement('canvas'), { width: Math.round(bmp.width * k), height: Math.round(bmp.height * k) })
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height)
  bmp.close()
  return { blob: await new Promise((r) => c.toBlob(r, 'image/jpeg', quality)), w: c.width, h: c.height }
}

// Kirim form + foto. Field "x[]" (pilihan ganda) dibaca Laravel sebagai array.
// Foto dikompres dulu; bila browser gagal membaca formatnya atau hasilnya tidak lebih kecil, kirim aslinya.
export async function insertWithPhoto(table, form, extra) {
  const fd = new FormData(form)
  const file = fd.get('photo')
  if (!file?.size) throw new Error('Foto wajib diisi.')
  const small = await toJpeg(file).then((r) => r.blob, () => null)
  if (small && small.size < file.size) fd.set('photo', small, 'foto.jpg')
  for (const [k, v] of Object.entries(extra)) fd.append(k, v)
  await api(`/${table}`, { body: fd })
}

// Foto privat: diambil dengan token, lalu jadi URL lokal (blob) untuk <img> dan Excel.
export async function photoUrl(path) {
  const res = await fetch(`/api/foto/${path}`, { headers: auth() })
  if (!res.ok) throw new Error('Foto tidak tersedia')
  return URL.createObjectURL(await res.blob())
}
