// Jalankan: node src/rekap.test.js
import assert from 'node:assert/strict'
import { rekap, rekapDeptRank, rekapKategori } from './rekap.js'

const at = (y, m, d) => new Date(y, m - 1, d, 9).toISOString()
const rows = [
  { type: 'safety', created_at: at(2026, 7, 3), status: 'closed' },  // Jul, Minggu 1
  { type: 'safety', created_at: at(2026, 7, 14), status: 'open' },   // Jul, Minggu 1 (batas)
  { type: 'safety', created_at: at(2026, 7, 15), status: 'closed' }, // Jul, Minggu 2
  { type: '5s', created_at: at(2026, 12, 31), status: 'open' },      // Des, Minggu 2
  { type: '5s', created_at: at(2026, 6, 30), status: 'open' },       // sebelum rentang: diabaikan
  { type: '5s', created_at: at(2027, 1, 2), status: 'open' },        // sesudah rentang: diabaikan
]
const r = rekap(rows, new Date(2026, 6, 1), 6)                      // Jul-Des 2026

assert.deepEqual(r.safety.m1, [2, 0, 0, 0, 0, 0])
assert.deepEqual(r.safety.m2, [1, 0, 0, 0, 0, 0])
assert.deepEqual(r.safety.total, [3, 0, 0, 0, 0, 0])
assert.deepEqual(r.safety.open1, [1, 0, 0, 0, 0, 0])
assert.deepEqual(r.safety.close1, [1, 0, 0, 0, 0, 0])
assert.deepEqual(r.safety.close2, [1, 0, 0, 0, 0, 0])
assert.deepEqual(r['5s'].total, [0, 0, 0, 0, 0, 1])
assert.deepEqual(r['5s'].open2, [0, 0, 0, 0, 0, 1])
assert.deepEqual(rekap(rows, new Date(2026, 10, 1), 3)['5s'].total, [0, 1, 1])  // Nov 2026 - Jan 2027 (lintas tahun)
assert.deepEqual(rekap(rows, new Date(2026, 6, 1), 1).safety.total, [3])          // satu bulan
const b = rekapDeptRank([
  { type: 'safety', created_at: at(2026, 11, 6), status: 'closed', target_dept_id: 3, rank: 'A', rank_after: 'C' },
  { type: 'safety', created_at: at(2026, 11, 6), status: 'open', target_dept_id: 4, rank: 'B', rank_after: null },
  { type: 'safety', created_at: at(2026, 11, 20), status: 'open', target_dept_id: 4, rank: 'B', rank_after: null },
  { type: '5s', created_at: at(2026, 11, 20), status: 'closed', target_dept_id: 3, rank: null, rank_after: null },
])
assert.deepEqual(b.depts, [4, 3])                                   // paling banyak Open di depan
assert.deepEqual(b.dept, { open: [2, 0], close: [0, 2] })
assert.deepEqual(b.rank, { before: [1, 2, 0], after: [0, 0, 1] })   // 5S tidak ikut dihitung
const k = rekapKategori([
  { type: 'safety', status: 'open', stop6: 'A', rank: 'A' },
  { type: 'safety', status: 'closed', stop6: 'O', rank: 'C' },
  { type: 'safety', status: 'open', stop6: 'O', rank: 'C' },
  { type: '5s', status: 'open', five_r: 2, sqcdm: ['S', 'M'] },        // dua SQCDM: dihitung di S dan M
  { type: '5s', status: 'closed', five_r: 2, sqcdm: ['M'] },
  { type: '5s', status: 'open', five_r: 5, sqcdm: ['Q'] },
])
assert.deepEqual(k.fiveR, { before: [0, 2, 0, 0, 1], open: [0, 1, 0, 0, 1] })
assert.deepEqual(k.sqcdm[1], [1, 0, 0, 0, 2])                         // R2: S=1, M=2
assert.deepEqual(k.sqcdm[4], [0, 1, 0, 0, 0])
assert.deepEqual(k.stop6, [3, 1, 0, 0, 0, 0, 0, 2])                   // Total, A..F, O
assert.deepEqual(k.rank, [3, 1, 0, 2])                                // Total, A, B, C
assert.deepEqual(k.rankStop6[0], [1, 1, 0, 0, 0, 0, 0, 0])
assert.deepEqual(k.rankStop6[1], [0, 0, 0, 0, 0, 0, 0, 0])
assert.deepEqual(k.rankStop6[2], [2, 0, 0, 0, 0, 0, 0, 2])
console.log('rekap OK')
