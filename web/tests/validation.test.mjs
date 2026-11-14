// The Validation page (redesign, 14 Nov): numbers come from the reports, qualifiers stay visible beside them, the charts
// use the right fields and signs, and every original table is still there.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const page = read('../src/pages/Validation.jsx');
const charts = read('../src/pages/validation/charts.jsx');
const css = read('../src/styles/layout.css');
const both = `${page}\n${charts}`;
const DATA = process.env.SHIFT_DATA_DIR;
const haveData = DATA && existsSync(join(DATA, 'validation', 'report_checks.json'));

test('no result is typed into the page: they are read from the reports', () => {
  const code = both.replace(/^\s*\/\/.*$/gm, '');
  for (const n of ['0.8%', '-0.2%', '69.3', '94.9', '93.9', '84.1', '7 of 8', '26.2', '11.8%']) assert.ok(!code.includes(n), `literal ${n}`);
  for (const f of ['cells_gap_pct', 'frp_gap_pct', 'calibrated_coverage_pct', 'factor_band_coverage_pct', "'SHIFT frp hit'", 'caught_pct', 'fine_shrunk', 'score_cells', 'score_frp']) {
    assert.ok(both.includes(f), `field ${f}`);
  }
});

test('each evidence card keeps its qualifier visible on the card (not in a tooltip)', () => {
  assert.match(page, /function Card\([^)]*qualifier[^)]*\)[\s\S]*?<p className="v-card-qual">\{qualifier\}<\/p>/);
  assert.match(page, /strength="Not fully independent"[\s\S]*?held-out tests of this kind, so its lead may be a little optimistic/);
  assert.match(page, /strength=\{`Small test · \$\{events\.length\} events`\}[\s\S]*?not proof that SHIFT detects disasters/);
  assert.match(page, /title="Calibrated range coverage"[\s\S]*?strength="Not fully independent"[\s\S]*?does not show that the published pre-2012 ranges hold the true value 95% of the time/);
  assert.doesNotMatch(both, /title=\{?["'`][^"'`]*(qualif|not fully)/i, 'qualifier not hidden in a title tooltip');
});

test('coverage is explained as coverage, never as accuracy, with no gauge', () => {
  assert.match(charts, /It is a class agreement, not an accuracy of the fire numbers/);
  assert.match(page, /It is not an accuracy score for the fire numbers/);
  assert.match(page, /not a guaranteed 95% bound on the true value/);
  assert.match(charts, /Illustration, not real values/);
  assert.doesNotMatch(both.replace(/^\s*\/\/.*$/gm, ''), /accurate|gauge|stroke-dashoffset/i);
});

test('region chart: final 2.5° and 10° gaps, zero in the middle, sign explained, MODIS alone named as the reference', () => {
  assert.match(charts, /const x = \(v\) => 50 \+ \(Math\.max\(-LIM, Math\.min\(LIM, \+v\)\) \/ LIM\) \* 50;/);
  assert.match(charts, /bar\(q\.fine_shrunk, 'final'\)/);
  assert.match(charts, /bar\(q\.coarse, 'coarse'\)/);
  assert.match(charts, /Right of zero:\s+SHIFT rises more at 2012 than MODIS alone/);
  assert.match(charts, /The reference is MODIS alone \(one sensor, so no switch\), not ground truth/);
  assert.match(charts, /keeps its value in the label/);
});

test('method chart: full 0 to 100 axis, higher is better, three scores', () => {
  assert.match(charts, /Higher is better\. Axis 0 to 100, not cut\./);
  assert.match(charts, /\[\['score', 'Combined'\], \['score_cells', 'Hotspots'\], \['score_frp', 'Fire power'\]\]/);
  assert.match(page, /not fully independent\s+of that choice/);
});

test('every original table is still on the page, under "View complete validation results"', () => {
  const all = page.slice(page.indexOf('<details className="v-all"'));
  assert.ok(all.includes('View complete validation results'));
  assert.ok((all.match(/<Table /g) || []).length >= 8, 'eight tables');
  for (const doc of ['VALIDATION_REPORT.md', 'SCIENTIFIC_LIMITATIONS.md', 'SCIENTIFIC_CLAIMS_CORRECTION_2026-11-11.md']) {
    assert.ok(page.includes(`docs/audit/${doc}`), doc);
    assert.ok(existsSync(new URL(`../../docs/audit/${doc}`, import.meta.url)), `${doc} exists`);
  }
});

test('no internal decision codes, current repository link, reduced motion respected', () => {
  assert.doesNotMatch(page.replace(/^\s*\/\/.*$/gm, ''), /\(D\d{1,2}\)/);
  assert.match(page, /https:\/\/github\.com\/squadronzero\/project-shift/);
  assert.doesNotMatch(page, /squadron-zero/);
  assert.match(css, /prefers-reduced-motion: no-preference\) \{\n  \.v-bar, \.v-hb-bar, \.v-gb-bar \{ transition/);
});

test('with the data: every region in the step file has a name, and the six card values exist in the reports', { skip: !haveData }, () => {
  const checks = JSON.parse(readFileSync(join(DATA, 'validation', 'report_checks.json'), 'utf8').replace(/\bNaN\b/g, 'null'));   // the report holds NaN, as the site's json() allows
  const harm = JSON.parse(readFileSync(join(DATA, 'validation', 'report_harmonise.json'), 'utf8'));
  const regions = readFileSync(join(DATA, 'validation', 'counts__resolution_region_steps.csv'), 'utf8').trim().split('\n').slice(1).map((l) => l.split(',')[0]);
  const names = page.match(/export const REGION_NAMES = \{([\s\S]*?)\};/)[1];
  for (const r of regions) assert.match(names, new RegExp(`\\b${r}:`), r);
  assert.equal(typeof harm.gate_2012_step.global.cells_gap_pct, 'number');
  assert.equal(typeof harm.gate_2012_step.global.frp_gap_pct, 'number');
  assert.ok(checks.coverage.cells.find((c) => c.variable === 'cells').calibrated_coverage_pct > 0);
  assert.ok(checks.known_events.table.length > 0);
  assert.equal(typeof checks.anomaly_rule.regions.plain.caught_pct, 'number');
});
