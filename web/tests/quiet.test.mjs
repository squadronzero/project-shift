// Quiet areas (judging audit P1, 14 Nov 2026): areas with too little fire do not get the
// "N unusual and M critical months" summary. Display rule only, no number changes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { QUIET_MIN_HOTSPOTS_PER_YEAR, isQuietArea, normalYearHotspots } from '../src/components/quiet.js';

const mon = (perMonth, years = [2003, 2025]) => {
  const rows = [];
  for (let y = 2002; y <= 2026; y++) for (let m = 0; m < 12; m++) rows.push({ year: y, month: m, value: perMonth(y, m) });
  return { rows, baseline: years };
};

test('threshold is 60 hotspots in a normal year', () => {
  assert.equal(QUIET_MIN_HOTSPOTS_PER_YEAR, 60);
});

test('a place with almost no fire is quiet', () => {
  const m = mon((y, mo) => (mo === 6 && y % 5 === 0 ? 1 : 0));   // one hotspot every fifth July
  assert.equal(normalYearHotspots(m), 0);
  assert.equal(isQuietArea(m), true);
});

test('a place with a short but real season is not quiet', () => {
  const m = mon((y, mo) => (mo >= 1 && mo <= 3 ? 40 : 0));       // 120 a year, all in Feb-Apr
  assert.equal(normalYearHotspots(m), 120);
  assert.equal(isQuietArea(m), false);
});

test('the median ignores one huge year and years outside the baseline', () => {
  const m = mon((y) => (y === 2010 ? 500 : y >= 2026 || y < 2003 ? 1000 : 2));   // 24 a year, one 6,000 year
  assert.equal(normalYearHotspots(m), 24);
  assert.equal(isQuietArea(m), true);
});

test('no rows means quiet (nothing to class)', () => {
  assert.equal(isQuietArea({ rows: [], baseline: [2003, 2025] }), true);
});

test('the page uses the quiet sentence and keeps the class meaning', () => {
  const explore = readFileSync(new URL('../src/pages/Explore.jsx', import.meta.url), 'utf8');
  const text = readFileSync(new URL('../src/content/text.js', import.meta.url), 'utf8');
  assert.match(explore, /T\.ledeQuiet\(/);
  assert.match(explore, /T\.monthGrid\.quietNote/);
  assert.match(text, /Too little fire here to class months reliably/);
  assert.match(text, /not fire danger ratings or emergency warnings/);
});
