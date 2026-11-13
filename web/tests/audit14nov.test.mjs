// Fixes from the judging audit, 14 Nov 2026: Method wording, provisional 2026, map month, date-line links.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
// The Method page is split over Method.jsx and src/pages/method/*
const method = [ '../src/pages/Method.jsx', ...readdirSync(new URL('../src/pages/method/', import.meta.url)).filter((f) => /\.jsx?$/.test(f)).sort().map((f) => `../src/pages/method/${f}`) ]
  .map((p) => readFileSync(new URL(p, import.meta.url), 'utf8')).join('\n');
const explore = read('../src/pages/Explore.jsx');

test('Method: no claim that a finer sensor cannot inflate the count', () => {
  assert.doesNotMatch(method, /cannot inflate/);
  assert.match(method, /inflates the count much less/);
});

test('Method: NOAA-21 is out of the harmonised record, not out of the site', () => {
  assert.match(method, /NOAA-21 \(VIIRS since 2023\) is not used in the harmonised record/);
});

test('Method: 2026 values from July are provisional near-real-time data', () => {
  assert.match(method, /From July 2026 the Suomi NPP data in the record is NASA's near-real-time version/);
  assert.match(method, /provisional/);
});

test('Explore: the map opens on the newest month of the record, labelled with its end', () => {
  assert.match(explore, /const lastMonth = lastIso\.slice\(0, 7\)/);
  assert.match(explore, /params\.m \|\| lastMonth/);
  assert.match(explore, /T\.map\.monthTo\(/);
});

test('Explore: box links get the typed-coordinates check (date line refused)', () => {
  assert.match(explore, /checkBox\(\{ w, s, e, n \}\)/);
  // checkBox itself (lib/area.js) refuses w >= e: "boxes across the date line are not supported"
  assert.match(read('../src/lib/area.js'), /if \(b\.w >= b\.e\) return/);
});
