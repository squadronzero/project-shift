// Brand lockup and site footer (14 Nov): presentation only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const app = read('../src/App.jsx');
const explore = read('../src/pages/Explore.jsx');
const footer = read('../src/components/SiteFooter.jsx');
const css = read('../src/styles/layout.css');
const text = read('../src/content/text.js');

test('the brand is still the home-and-refresh button, name and tagline unchanged', () => {
  assert.match(app, /className="brandbtn" aria-label=\{T\.brandAction\}[^>]*onClick=\{home\}/);
  assert.match(text, /brand: 'S\.H\.I\.F\.T',/);
  assert.match(text, /tagline: 'One fire record from two generations of NASA satellites, from 2002 to the latest data',/);
});

test('lockup: centred on one line with a rule on wide screens, stacked on tablets and phones, no heavy stretch', () => {
  assert.match(css, /\.brand \{ display: flex; align-items: center;/);
  assert.match(css, /\.brand p \{ margin: 0; padding-left: 16px; border-left: 1px solid var\(--rule\);/);
  assert.match(css, /\.brand \{ flex-direction: column; align-items: flex-start;/);
  assert.doesNotMatch(css, /\.brand h1 \{[^}]*font-stretch: 125%/);
});

test('footer: team credit, independent of NASA, current repository, method and credits links', () => {
  assert.match(text, /credit: 'Created by Team Squadron Zero'/);
  assert.match(text, /not created, approved or endorsed by NASA/);
  assert.match(footer, /https:\/\/github\.com\/squadronzero\/project-shift/);
  assert.doesNotMatch(footer, /squadron-zero'/);
  assert.match(footer, /onNav\('method', 'sources'\)/);
  assert.doesNotMatch(footer, /<img|<svg/i, 'no logos or pictures');
});

test('footer placement: after the long pages, at the end of the analysis column on Explore (never over the map)', () => {
  assert.match(app, /\{current !== 'explore' && <SiteFooter onNav=\{goTo\} \/>\}/);
  assert.match(app, /footer=\{<SiteFooter onNav=\{goTo\} \/>\}/);
  assert.match(explore, /\{footer\}\n      <\/section>\n    <\/main>/);
  assert.doesNotMatch(css, /\.sitefooter \{[^}]*position: (fixed|absolute|sticky)/);
});
