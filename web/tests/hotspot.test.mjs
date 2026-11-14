// "What is a hotspot?" card (14 Nov): native disclosure, the whole header is the control, wording matches the method.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const card = read('../src/components/HotspotCard.jsx');
const text = read('../src/content/text.js');
const css = read('../src/styles/layout.css');
const explore = read('../src/pages/Explore.jsx');

test('a native details/summary: the whole header is one control, no nested buttons', () => {
  assert.match(card, /<details className="hs-card"/);
  assert.match(card, /<summary>[\s\S]*<\/summary>/);
  const summary = card.match(/<summary>([\s\S]*?)<\/summary>/)[1];
  assert.doesNotMatch(summary, /<button|<a |onClick/);
  assert.match(summary, /className="hs-icon" aria-hidden="true"/);
  assert.match(explore, /<HotspotCard \/>/);
  assert.doesNotMatch(explore, /<details className="define"><summary>\{T\.whatIsHotspot\}/);
});

test('action text and chevron follow the state; reduced motion turns movement off', () => {
  assert.match(card, /\{open \? H\.less : H\.more\}/);
  assert.match(text, /more: 'Learn more',\n    less: 'Show less',/);
  assert.match(css, /\.hs-card\[open\] \.hs-chev \{ transform: rotate\(180deg\); \}/);
  assert.match(css, /prefers-reduced-motion: no-preference\) \{ \.hs-card\[open\] \.hs-body \{ animation/);
  assert.match(css, /prefers-reduced-motion: reduce\) \{ \.hs-chev \{ transition: none; \} \}/);
  assert.match(css, /\.hs-card > summary \{[^}]*min-height: 44px/);
});

test('wording matches the method: 0.05° cell-days, "much less" (not "stops"), an index not energy, not separate fires', () => {
  assert.match(text, /A 0\.05° grid cell \(about 5 km across\) with at least one fire detection on a day counts once that day/);
  assert.match(text, /inflate the count much less/);
  assert.doesNotMatch(text, /stops the finer VIIRS pixels from inflating/);
  assert.match(text, /an index of how much intense burning was seen, not an amount of energy/);
  assert.match(text, /Neither number counts separate fires/);
  assert.match(text, /diagram: 'Illustration, not real data\. Each square is a grid cell, not a fire\.'/);
});
