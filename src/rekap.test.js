// Jalankan: node src/rekap.test.js
import assert from 'node:assert/strict'
import { rekap } from './rekap.js'

const at = (y, m, d) => new Date(y, m - 1, d, 9).toISOString()
const r = rekap([
  { type: 'safety', created_at: at(2026, 7, 3), status: 'closed' },  // Jul, Minggu 1
  { type: 'safety', created_at: at(2026, 7, 14), status: 'open' },   // Jul, Minggu 1 (batas)
  { type: 'safety', created_at: at(2026, 7, 15), status: 'closed' }, // Jul, Minggu 2
  { type: '5s', created_at: at(2026, 12, 31), status: 'open' },      // Des, Minggu 2
  { type: '5s', created_at: at(2026, 6, 30), status: 'open' },       // Semester 1: diabaikan
  { type: '5s', created_at: at(2027, 1, 2), status: 'open' },        // tahun lain: diabaikan
], 2026, 2)

assert.deepEqual(r.safety.m1, [2, 0, 0, 0, 0, 0])
assert.deepEqual(r.safety.m2, [1, 0, 0, 0, 0, 0])
assert.deepEqual(r.safety.total, [3, 0, 0, 0, 0, 0])
assert.deepEqual(r.safety.open1, [1, 0, 0, 0, 0, 0])
assert.deepEqual(r.safety.close1, [1, 0, 0, 0, 0, 0])
assert.deepEqual(r.safety.close2, [1, 0, 0, 0, 0, 0])
assert.deepEqual(r['5s'].total, [0, 0, 0, 0, 0, 1])
assert.deepEqual(r['5s'].open2, [0, 0, 0, 0, 0, 1])
console.log('rekap OK')
