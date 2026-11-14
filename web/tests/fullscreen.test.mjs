// Fullscreen map (14 Nov): the browser request and its fallback, and the guards that keep it one map with one state.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { enterFullscreen, nativeApi } from '../src/components/fullscreenApi.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const explore = read('../src/pages/Explore.jsx');
const hook = read('../src/components/fullscreen.js');
const css = read('../src/styles/layout.css');

// a fake page: el.requestFullscreen resolves, rejects or is missing
function fakePage({ request = 'ok', webkit = false, enabled = true } = {}) {
  const doc = { fullscreenElement: null, fullscreenEnabled: enabled, exitFullscreen() { doc.fullscreenElement = null; return Promise.resolve(); } };
  const el = {};
  const fn = function req() {
    if (request === 'reject') return Promise.reject(new Error('denied'));
    if (request === 'throw') throw new Error('not allowed');
    doc.fullscreenElement = el; return webkit ? undefined : Promise.resolve();
  };
  if (request !== 'missing') el[webkit ? 'webkitRequestFullscreen' : 'requestFullscreen'] = fn;
  if (webkit) { doc.webkitExitFullscreen = doc.exitFullscreen; delete doc.exitFullscreen; doc.webkitFullscreenEnabled = enabled; delete doc.fullscreenEnabled;
    Object.defineProperty(doc, 'webkitFullscreenElement', { get: () => doc.fullscreenElement }); }
  return { el, doc };
}

test('F10: browser fullscreen that succeeds gives native mode', async () => {
  const { el, doc } = fakePage();
  assert.equal(nativeApi(el, doc).supported, true);
  assert.equal(await enterFullscreen(el, doc), 'native');
  assert.equal(nativeApi(el, doc).current(), el);
});

test('F10b: older webkit names work too', async () => {
  const { el, doc } = fakePage({ webkit: true });
  assert.equal(await enterFullscreen(el, doc), 'native');
});

test('F11: no Fullscreen API (iPhone Safari) gives the window-filling layer', async () => {
  const { el, doc } = fakePage({ request: 'missing' });
  assert.equal(nativeApi(el, doc).supported, false);
  assert.equal(await enterFullscreen(el, doc), 'viewport');
  const off = fakePage({ enabled: false });
  assert.equal(await enterFullscreen(off.el, off.doc), 'viewport');
});

test('F12: a refused or throwing request falls back, never throws', async () => {
  for (const request of ['reject', 'throw']) {
    const { el, doc } = fakePage({ request });
    assert.equal(await enterFullscreen(el, doc), 'viewport');
    assert.equal(doc.fullscreenElement, null);
  }
});

test('one map: a single MapView, resized (not remounted) when the layout changes', () => {
  assert.equal((explore.match(/<MapView\b/g) || []).length, 1);
  assert.match(explore, /layoutKey=\{`\$\{fs\.mode\}\|\$\{inspecting\}`\}/);
  assert.match(read('../src/components/MapView.jsx'), /requestAnimationFrame\(\(\) => m\.resize\(\)\)/);
  // the map body is always rendered, so turning fullscreen on does not move the map in the React tree
  assert.match(explore, /\{fs\.full && <div className="fs-bar">[\s\S]*?<div className="mapbody">\s*<div className="mapstage">/);
});

test('one search bar: the same element moves between the story and the fullscreen bar', () => {
  assert.equal((explore.match(/<SearchBar\b/g) || []).length, 1);
  assert.match(explore, /\{!fs\.full && searchBar\}/);
  assert.match(explore, /<div className="fs-search">\{searchBar\}<\/div>/);
});

test('F19: names, Escape, focus return and the rest of the page made inert', () => {
  assert.match(explore, /aria-label=\{F\.enter\(view\)\}/);
  assert.match(explore, /aria-label=\{F\.exit\(view\)\}/);
  assert.match(explore, /role: 'region', 'aria-label': F\.workspace\(view\)/);
  assert.match(hook, /e\.key !== 'Escape'/);
  assert.match(hook, /fullscreenchange/);
  assert.match(hook, /inertOutside/);
  assert.match(hook, /\.focus\(\{ preventScroll/);
  assert.doesNotMatch(hook, /setTimeout/, 'no arbitrary delays');
});

test('F13, F18, F20: the fallback fills the window with safe areas, dvh, and no animation for reduced motion', () => {
  assert.match(css, /\.mapside\.fs \{ position: fixed; inset: 0;[^}]*height: 100dvh;/);
  assert.match(css, /safe-area-inset-top/);
  assert.match(css, /prefers-reduced-motion: no-preference\) \{ \.mapside\.fs \{ animation/);
});

test('F22: the inspector reuses the existing panels and the same numbers, with the range note', () => {
  const ins = read('../src/components/FsInspector.jsx');
  assert.match(ins, /<CellPanel /);
  assert.match(ins, /<RecentPanel /);
  assert.match(ins, /T\.compare\.modisShort/);
  assert.doesNotMatch(ins, /from '\.\.\/lib\/(harmon|aggregate|monthly)/, 'no new computation');
  assert.match(explore, /!inspecting && layerMode === 'record' && <CellPanel/);
});

test('F08: the hover tooltip never catches a press, so a tap on a cell reaches the map', () => {
  assert.match(css, /\.tip, \.tip \.maplibregl-popup-content \{ pointer-events: none; \}/);
});

test('the browser-test hook is off for visitors (only set when a test defines __SHIFT_TEST__)', () => {
  assert.match(read('../src/components/MapView.jsx'), /if \(window\.__SHIFT_TEST__\) window\.__shiftMap = m;/);
});
