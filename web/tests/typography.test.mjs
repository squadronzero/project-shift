// UI Trial 1.0 (14 Nov): the approved Space Observatory colours and the four fonts, in one place. The scientific
// map and chart colours are not part of the interface palette and must not move with it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const tokens = read('../src/theme/tokens.css');
const css = read('../src/styles/layout.css');
const fonts = read('../src/theme/fonts.js');
const pkg = JSON.parse(read('../package.json'));
const html = read('../index.html');
const dark = tokens.slice(tokens.indexOf(":root[data-theme='dark']"));

test('the seven approved colours, exactly, in the dark theme', () => {
  for (const [k, v] of [['--mist', '#090D12'], ['--surface', '#151D26'], ['--ink', '#F1F4F7'], ['--body', '#BBC8D2'],
    ['--accent', '#FFAD72'], ['--link', '#86C9FF'], ['--rule', '#34414D']]) {
    assert.match(dark, new RegExp(`\\n  ${k}: ${v};`), `${k} ${v}`);
  }
});

test('scientific colours are unchanged and separate from the interface accent', () => {
  for (const [k, v] of [['--ramp-1', '#4A2A1C'], ['--ramp-2', '#7A3A1E'], ['--ramp-3', '#B4532A'], ['--ramp-4', '#DE7740'], ['--ramp-5', '#F7A26E'], ['--ramp-6', '#FFD3B0'],
    ['--recent-1', '#FBE36A'], ['--recent-4', '#E2457A'], ['--class-critical', '#F7A26E'], ['--chart-highlight', '#F7A26E'], ['--map-land', '#1D2933'], ['--map-sea', '#0D1A24'], ['--nodata-bg', '#1A242D']]) {
    assert.match(dark, new RegExp(`\\n  ${k}: ${v};`), `${k} ${v}`);
  }
});

test('four fonts, bundled (no Google Fonts link), all under the SIL Open Font License', () => {
  for (const f of ['@fontsource-variable/space-grotesk', '@fontsource-variable/bodoni-moda', '@fontsource/ibm-plex-mono', '@fontsource-variable/orbitron']) {
    assert.ok(pkg.dependencies[f], f);
    assert.ok(fonts.includes(f), `${f} imported`);
    assert.match(read(`../node_modules/${f}/LICENSE`), /SIL Open Font License, Version 1\.1/, `${f} licence`);
  }
  assert.ok(!pkg.dependencies['@fontsource-variable/archivo'], 'old font removed');
  assert.doesNotMatch(html + fonts + css, /fonts\.googleapis|fonts\.gstatic/);
  assert.match(fonts, /every font named Armstrong found is commercial/);
});

test('font roles: UI default, editorial for large page headings, mono for readouts, brand for the wordmark', () => {
  assert.match(tokens, /--font-ui: 'Space Grotesk Variable'/);
  assert.match(tokens, /--font-editorial: 'Bodoni Moda Variable'/);
  assert.match(tokens, /--font-data: 'IBM Plex Mono'/);
  assert.match(tokens, /--font-brand: 'Orbitron Variable'/);
  assert.match(tokens, /--font-body: var\(--font-ui\);/);
  assert.match(css, /\.brand h1 \{ font-family: var\(--font-brand\);/);
  assert.match(css, /\.page h2, \.story h2, \.mobile-summary h2, \.v-hero h2, \.m-hero h2 \{\n  font-family: var\(--font-editorial\);/);
  assert.match(css, /\.badge, code, kbd,\n\.cellpanel dd,[\s\S]*?\{\n  font-family: var\(--font-data\);/);
  assert.match(css, /body \{[\s\S]*?color: var\(--body\);[\s\S]*?line-height: var\(--line-body\);/);
});

test('no white flash: the page background is the canvas colour before the stylesheet loads', () => {
  assert.match(html, /<style>html\{background:#090D12;color-scheme:dark\}<\/style>/);
  assert.match(html, /<html lang="en" data-theme="dark">/);
});
