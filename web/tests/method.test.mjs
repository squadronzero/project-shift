// The redesigned Method and data page (14 Nov 2026): every source and fact of the old page is kept,
// no internal decision codes reach the public, and the satellite timeline matches the settings.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { SECTIONS, SENSORS, STEPS, FEATURES, SOURCES, INTRO } from '../src/pages/method/content.js';

const files = ['../src/pages/Method.jsx', ...readdirSync(new URL('../src/pages/method/', import.meta.url))
  .filter((f) => /\.jsx?$/.test(f)).map((f) => `../src/pages/method/${f}`)];
const page = files.map((p) => readFileSync(new URL(p, import.meta.url), 'utf8')).join('\n');

test('Method: six sections, in order, each rendered with its id', () => {
  assert.deepEqual(SECTIONS.map(([id]) => id), ['overview', 'process', 'satellites', 'explore', 'limits', 'sources']);
  for (const [id] of SECTIONS) assert.match(page, new RegExp(`id="${id}"|id: '${id}'|sec\\(\\s*'${id}'|"${id}"`), id);
});

test('Method: six harmonisation steps, four intro stages, eight feature cards', () => {
  assert.deepEqual(STEPS.map((s) => s.id), ['collect', 'hotspots', 'nonfire', 'calibrate', 'gaps', 'record']);
  assert.equal(INTRO.stages.length, 4);
  assert.equal(FEATURES.length, 8);
  for (const f of FEATURES) assert.ok(readFileSync(new URL(`../public/${f.img}`, import.meta.url)).length > 1000, f.img);
});

test('Method: every DOI and data link of the old page is still cited', () => {
  for (const doi of ['10.5067/FIRMS/MODIS/MCD14ML', '10.5067/FIRMS/VIIRS/VNP14IMGT_NRT.002', '10.5067/FIRMS/VIIRS/VJ114IMGT_NRT.002']) {
    assert.ok(page.includes(`https://doi.org/${doi}`), doi);
  }
  assert.ok(page.includes('https://power.larc.nasa.gov'));
  assert.ok(page.includes('https://github.com/squadronzero/project-shift'));
  assert.ok(!page.includes('squadronzero/squadron-zero'), 'old repository link');
  assert.ok(SOURCES.length >= 10);
});

test('Method: no internal decision codes (D19, D29 ...) in public text', () => {
  const text = page.replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(text, /\(D\d{1,2}\)|\bD\d{1,2}\b(?![-\w])/);
});

test('Method: factor years and gap-fill accuracy match the run', () => {
  assert.match(page, /2012 to 2019/);
  assert.match(page, /2020 to 2025/);
  assert.match(page, /about 2 to 6 percent/);
  assert.doesNotMatch(page, /3 to 6 percent/);
  assert.doesNotMatch(page, /over 2012 to 2025/);
});

test('Method: satellite timeline matches the settings and the outage dates', () => {
  const by = Object.fromEntries(SENSORS.map((s) => [s.id, s]));
  assert.deepEqual(Object.keys(by), ['terra', 'aqua', 'snpp', 'noaa20', 'noaa21']);
  assert.deepEqual(by.snpp.segments.find((s) => s[2] === 'gap').slice(0, 2), ['2026-04-28', '2026-06-02']);
  assert.equal(by.aqua.segments.find((s) => s[2] === 'off')[0], '2023-02-01');   // settings d19_fill_off_from
  assert.equal(by.terra.segments[0][0], '2002-01-01');                            // settings modis_first_year
  for (const s of [by.terra, by.aqua]) assert.equal(s.segments.find((x) => x[2] === 'source')[1], '2012-01-19');
  assert.ok(by.noaa21.segments.every((x) => x[2] === 'recent'), 'NOAA-21 only in the recent layer');
  for (const s of SENSORS) for (const [a, b] of s.segments) assert.ok(a <= b, `${s.id} ${a} ${b}`);
});

test('Method: diagrams are labelled as illustrations', () => {
  const d = readFileSync(new URL('../src/pages/method/Diagrams.jsx', import.meta.url), 'utf8');
  assert.ok((d.match(/[Ii]llustration/g) || []).length >= 5);
});

test('Method: section navigation honours reduced motion', () => {
  assert.match(page, /prefers-reduced-motion/);
  const css = readFileSync(new URL('../src/styles/layout.css', import.meta.url), 'utf8');
  assert.match(css, /\.m-step-wrap[^}]*animation/);
  assert.match(css, /prefers-reduced-motion: no-preference\) \{ \.m-step-wrap/);
});
