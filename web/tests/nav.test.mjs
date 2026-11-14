// Icon navigation (14 Nov): four icons, the same four destinations, names for screen readers, tooltips on hover and
// focus, captions where there is no hover, and a current-page cue that is not colour alone.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const app = read('../src/App.jsx');
const icons = read('../src/components/NavIcons.jsx');
const css = read('../src/styles/layout.css');
const text = read('../src/content/text.js');

test('the same four views and destinations, in the same order', () => {
  assert.match(text, /views: \{ explore: 'Explore', switch: 'The 2012 switch', validation: 'Validation', method: 'Method and data' \}/);
  assert.match(app, /const VIEWS = Object\.keys\(T\.views\);/);
  assert.match(app, /onClick=\{\(\) => setCurrent\(id\)\}/);
});

test('one icon per view, inline SVG, no icon library', () => {
  for (const id of ['explore', 'switch', 'validation', 'method']) assert.match(icons, new RegExp(`\\n  ${id}: <>`), id);
  assert.match(icons, /aria-hidden="true"/);
  const pkg = read('../package.json');
  assert.doesNotMatch(pkg, /lucide|heroicons|react-icons|fontawesome/i);
});

test('screen readers hear the page name and the current page', () => {
  assert.match(app, /aria-label=\{T\.views\[id\]\}/);
  assert.match(app, /aria-current=\{current === id \? 'page' : undefined\}/);
  assert.match(app, /<span className="tab-label" aria-hidden="true">\{T\.views\[id\]\}<\/span>/);
});

test('tooltip on hover and keyboard focus, Escape hides it, captions where there is no hover', () => {
  assert.match(css, /\.tab:hover \.tab-label, \.tab:focus-visible \.tab-label \{ opacity: 1; visibility: visible; \}/);
  assert.match(css, /\.iconnav\.tips-off \.tab-label \{ opacity: 0; visibility: hidden; \}/);
  assert.match(app, /e\.key === 'Escape'\) setTipOff\(true\)/);
  assert.match(css, /@media \(max-width: 900px\), \(hover: none\) \{\n  \.iconnav/);
  assert.match(css, /\.tab:first-child \.tab-label \{ left: 0; transform: none; \}/);
});

test('current page: underline, pill and heavier line (not colour alone); 44 px targets', () => {
  assert.match(css, /\.tab\.on \{[^}]*border-bottom-color: var\(--accent\)/);
  assert.match(css, /\.tab\.on \.tab-icon \* \{ stroke-width: 2\.3; \}/);
  assert.match(css, /\.tab \{\n[^}]*min-height: 44px;/);
});
