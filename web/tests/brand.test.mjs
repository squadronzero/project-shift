// The S.H.I.F.T brand as home and refresh (14 Nov 2026): it never claims newer data that was not loaded.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const store = new Map();
globalThis.sessionStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
const { newerThanBefore } = await import('../src/refresh.js');
const before = (b) => store.set('shift-refresh-before', JSON.stringify(b));

test('no click before: no note', () => { store.clear(); assert.equal(newerThanBefore({ meta: 'a', recent: 'x' }), null); });
test('same versions after the reload: no note, and the memory is cleared', () => {
  before({ meta: 'a', recent: 'x' }); assert.equal(newerThanBefore({ meta: 'a', recent: 'x' }), null);
  assert.equal(store.has('shift-refresh-before'), false);
});
test('a newer recent snapshot is reported as such, the record is not', () => {
  before({ meta: 'a', recent: 'x' }); assert.deepEqual(newerThanBefore({ meta: 'a', recent: 'y' }), { record: false, recent: true });
});
test('a newer record is reported', () => {
  before({ meta: 'a', recent: 'x' }); assert.deepEqual(newerThanBefore({ meta: 'b', recent: 'x' }), { record: true, recent: false });
});
test('a missing recent status is not called an update', () => {
  before({ meta: 'a', recent: 'x' }); assert.equal(newerThanBefore({ meta: 'a', recent: '' }), null);
});
test('the refresh only re-reads published files and starts no download', () => {
  const src = readFileSync(new URL('../src/refresh.js', import.meta.url), 'utf8').replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(src, /firms|MAP_KEY|api\.github|workflow/i);
  assert.match(src, /cache: 'reload'/);
});
test('brand text and title', () => {
  assert.match(readFileSync(new URL('../src/content/text.js', import.meta.url), 'utf8'), /brand: 'S\.H\.I\.F\.T'/);
  assert.match(readFileSync(new URL('../index.html', import.meta.url), 'utf8'), /<title>S\.H\.I\.F\.T fire calendar<\/title>/);
});
