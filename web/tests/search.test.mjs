// Search bar and drawn shapes (UI lab, 14 Nov 2026): suggestions come only from SHIFT's own lists,
// coordinates are read in one stated order and never swapped, shapes use the country rule and refuse the date line.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { ALIASES, matchPlaces, norm, parseCoords, looksLikeCoords } from '../src/components/search.js';
import { cleanRing, polygonArea, polygonFromSpec } from '../src/components/polygon.js';

const require = createRequire(import.meta.url);
const world = require('world-atlas/countries-50m.json');
// the same ids as lib/area.js (nameId)
const nameId = (n) => n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const COUNTRIES = world.objects.countries.geometries.filter((g) => g.properties?.name).map((g) => ({ id: nameId(g.properties.name), name: g.properties.name }));
const placesSrc = readFileSync(new URL('../src/content/places.js', import.meta.url), 'utf8');
const PRESETS = [...placesSrc.matchAll(/id: '([^']+)', name: '([^']+)'/g)].map((m) => ({ id: m[1], name: m[2] }));

test('presets are read from places.js', () => { assert.ok(PRESETS.length >= 10); });

test('every alias points at a real country id', () => {
  const ids = new Set(COUNTRIES.map((c) => c.id));
  for (const k of Object.keys(ALIASES)) assert.ok(ids.has(k), `alias key ${k} is not a country id`);
});

test('prefix matches come first, presets are labelled as presets', () => {
  const r = matchPlaces('ban', COUNTRIES, PRESETS);
  assert.equal(r[0].name, 'Bangladesh'); assert.equal(r[0].kind, 'country');
  assert.ok(r.some((x) => x.kind === 'preset' && /Bangladesh/.test(x.name)));
  const f = matchPlaces('flo', COUNTRIES, PRESETS);
  assert.equal(f[0].kind, 'preset'); assert.equal(f[0].name, 'Florida');
});

test('word starts, inside matches, accents, abbreviations and aliases', () => {
  assert.ok(matchPlaces('austral', COUNTRIES, PRESETS).some((x) => x.kind === 'preset' && x.id === 'se_australia'));
  assert.equal(matchPlaces('cote', COUNTRIES, PRESETS)[0].id, 'cote-d-ivoire');
  assert.equal(matchPlaces('ivory coast', COUNTRIES, PRESETS)[0].id, 'cote-d-ivoire');
  assert.equal(matchPlaces('usa', COUNTRIES, PRESETS)[0].id, 'united-states-of-america');
  assert.ok(matchPlaces('democratic', COUNTRIES, PRESETS).some((x) => x.id === 'dem-rep-congo'));
  assert.equal(matchPlaces('burma', COUNTRIES, PRESETS)[0].id, 'myanmar');
  assert.equal(norm('Bosnia and Herz.'), 'bosnia and herzegovina');
});

test('no invented places: nothing for nonsense, every result is from the lists', () => {
  assert.deepEqual(matchPlaces('zzqx', COUNTRIES, PRESETS), []);
  const all = new Set([...COUNTRIES, ...PRESETS].map((x) => x.name));
  for (const q of ['a', 'in', 'sa', 'is']) for (const r of matchPlaces(q, COUNTRIES, PRESETS)) assert.ok(all.has(r.name));
});

test('coordinates: point, point with radius, box, in the stated order', () => {
  assert.deepEqual(parseCoords('23.8103, 90.4125'), { kind: 'point', lat: 23.8103, lon: 90.4125, km: 50 });
  assert.deepEqual(parseCoords('23.81 90.41 100'), { kind: 'point', lat: 23.81, lon: 90.41, km: 100 });
  assert.deepEqual(parseCoords('88, 20.5, 92.7, 26.7'), { kind: 'box', w: 88, s: 20.5, e: 92.7, n: 26.7 });
  assert.ok(looksLikeCoords('-17.5, 179')); assert.ok(!looksLikeCoords('Bangladesh'));
});

test('coordinates: never swapped, clear errors', () => {
  assert.match(parseCoords('90.41, 23.81').error, /latitude first/);       // looks swapped: refused, not swapped
  assert.match(parseCoords('23, 200').error, /Longitude 200/);
  assert.match(parseCoords('175, -20, -175, -10').error, /date line/);
  assert.match(parseCoords('88, 26.7, 92.7, 20.5').error, /South must be smaller/);
  assert.match(parseCoords('1, 2, 3, 4, 5').error, /5 numbers/);
  assert.match(parseCoords('23, 90, 0').error, /radius/);
  assert.ok(parseCoords('23,,90').kind === 'point');
});

test('shapes: corners kept, cells by centre inside, like a country', () => {
  const a = polygonArea(cleanRing([[88, 21], [92, 21], [92, 26], [88, 26]]).ring);
  assert.equal(a.kind, 'polygon'); assert.equal(a.cells.length, 4 * 5);
  const tri = polygonArea(cleanRing([[0, 0], [10, 0], [0, 10]]).ring);
  assert.equal(tri.cells.length, 45);                                 // centres strictly below the diagonal
  const tiny = polygonArea(cleanRing([[90.1, 23.1], [90.3, 23.1], [90.2, 23.3]]).ring);
  assert.equal(tiny.cells.length, 1);                                 // too small for a centre: the cell it sits in
});

test('shapes: date line refused, wrapped longitudes handled, degenerate shapes refused', () => {
  assert.match(cleanRing([[175, -20], [-175, -20], [-175, -10], [175, -10]]).error, /date line/);
  assert.deepEqual(cleanRing([[448, 21], [452, 21], [452, 26]]).ring, [[88, 21], [92, 21], [92, 26]]);   // a 2D world copy
  assert.match(cleanRing([[0, 0], [1, 1]]).error, /three corners/);
  assert.match(cleanRing([[0, 0], [1, 1], [2, 2]]).error, /one line/);
});

test('shapes: share link round trip', () => {
  const a = polygonArea(cleanRing([[88.123, 21], [92, 21.456], [90, 26]]).ring);
  assert.equal(a.spec, 'poly:88.12 21;92 21.46;90 26');
  const b = polygonFromSpec(a.spec);
  assert.deepEqual(b.cells, a.cells);
  assert.equal(polygonFromSpec('poly:175 -20;-175 -20;-175 -10'), null);
  assert.equal(polygonFromSpec('poly:abc'), null);
});
