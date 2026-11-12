// The app shell: header, navigation between views, the colour theme, and loading meta.json.
// UI lab (14 Nov): with `t=<template>` in the page address the same pages run inside one of six lab designs
// (src/lab/). Without it the site is exactly the official one.
import { useEffect, useRef, useState } from 'react';
import T, { fmtDay } from './content/text.js';
import useTheme from './theme/useTheme.js';
import Explore from './pages/Explore.jsx';
import Switch2012 from './pages/Switch2012.jsx';
import Validation from './pages/Validation.jsx';
import Method from './pages/Method.jsx';
import Nav from './components/Nav.jsx';
import Gallery from './lab/Gallery.jsx';
import { HudButton, HudDrawer, HudProvider, useHud } from './lab/Hud.jsx';
import { TEMPLATES, templateById } from './lab/templates.js';
import { dateOf, json, lastDataDay } from './lib/data.js';

import { readHash, writeHash } from './lib/url.js';
import { recentFreshness, recentStatus } from './lib/recent.js';

const VIEWS = Object.keys(T.views);
const PAGE_ICONS = { explore: 'globe', switch: 'switch', validation: 'shield', method: 'book' };

export default function App() {
  const [{ view, params }] = useState(() => {
    const h = readHash();
    return { view: VIEWS.includes(h.view) || h.view === 'gallery' ? h.view : 'explore', params: h.params };
  });
  const [tplId, setTplId] = useState(() => (templateById(params.t) ? params.t : ''));
  const tpl = templateById(tplId);
  const [theme, mode, setMode] = useTheme(tplId);
  const [current, setCurrent] = useState(view);
  const [meta, setMeta] = useState(null);
  const [recent, setRecent] = useState(null);
  useEffect(() => { recentStatus().then(setRecent); }, []);
  const [error, setError] = useState(null);

  useEffect(() => { json('meta.json').then(setMeta).catch(() => setError(T.loadError)); }, []);
  useEffect(() => { if (current !== 'explore') writeHash(current, tplId ? { t: tplId } : {}); }, [current, tplId]);

  // Explore keeps its area, dates and layer when the design changes or another page is opened in between
  const exploreParams = useRef(view === 'explore' ? params : {});
  const go = (v) => { if (current === 'explore') exploreParams.current = readHash().params; setCurrent(v); };
  const pickTemplate = (id) => {
    if (current === 'explore') exploreParams.current = readHash().params;
    const t = templateById(id);
    if (t) setMode(t.prefers);
    setTplId(id);
    if (current === 'gallery') setCurrent('explore');
  };

  const badges = <>
    {meta && <span className="badge">{T.dataTo(fmtDay(dateOf(meta, lastDataDay(meta))))}</span>}
    {recent?.latest_detection_utc && <span className={recentFreshness(recent)?.stale ? 'badge warn' : 'badge'}>{T.recentTo(recent.latest_detection_utc,
      recentFreshness(recent)?.stale)}</span>}
  </>;
  const themePick = (
    <label className="theme-pick">{T.theme.label}
      <select value={mode} onChange={(e) => setMode(e.target.value)}>
        {['system', 'light', 'dark'].map((m) => <option key={m} value={m}>{T.theme[m]}</option>)}
      </select>
    </label>
  );
  const designPick = (
    <label className="design-pick">{T.lab.change}
      <select value={tplId} onChange={(e) => pickTemplate(e.target.value)}>
        <option value="">{T.lab.current}</option>
        {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{`${t.code} ${t.name}`}</option>)}
      </select>
    </label>
  );
  const pages = <>
    {error && <main className="page"><p className="notice" role="alert">{error}</p></main>}
    {current === 'explore' && meta && <Explore key={tplId || 'site'} meta={meta} theme={theme} params={exploreParams.current} tpl={tpl} go={go} />}
    {current === 'switch' && <Switch2012 theme={theme} />}
    {current === 'validation' && <Validation />}
    {current === 'method' && <Method meta={meta} />}
  </>;

  if (current === 'gallery') {
    return (
      <div className="app lab-gallery-app">
        <Gallery onPick={pickTemplate} onCurrent={() => { setTplId(''); setCurrent('explore'); }} />
      </div>
    );
  }

  if (!tpl) {
    return (
      <div className="app">
        {/* keyboard users: one stop before the map and its controls (12 Nov). A button, not a link, because the page
            address carries the view and the shared area, and a #results link would overwrite it. */}
        <button type="button" className="skip" onClick={() => { const el = document.getElementById('results') || document.querySelector('main'); el?.focus(); el?.scrollIntoView(); }}>{T.skip}</button>
        <header className="top">
          <div className="brand">
            <h1>{T.brand}</h1>
            <p>{T.tagline}</p>
          </div>
          <div className="top-right">
            {badges}
            {themePick}
            <button type="button" className="link lab-link" onClick={() => go('gallery')}>{T.lab.galleryLink}</button>
          </div>
          <Nav views={VIEWS} current={current} setCurrent={setCurrent} />
        </header>
        {pages}
      </div>
    );
  }

  return (
    <HudProvider>
      <LabShell tpl={tpl} current={current} go={go} badges={badges} themePick={themePick} designPick={designPick}>
        {pages}
      </LabShell>
    </HudProvider>
  );
}

// The frame every lab design shares: a compact bar, the HUD (tools and pages) and a drawer slot.
// The design's own CSS (src/lab/templates.css) decides where each part sits.
function LabShell({ tpl, current, go, badges, themePick, designPick, children }) {
  const h = useHud();
  const toolsRef = useRef(null), drawerRef = useRef(null);
  useEffect(() => { h.setSlots({ tools: toolsRef.current, drawer: drawerRef.current }); }, []);  // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { h.close(); }, [current]);  // eslint-disable-line react-hooks/exhaustive-deps
  const pageButtons = VIEWS.map((id) => (
    <HudButton key={id} id={`page-${id}`} icon={PAGE_ICONS[id]} label={T.views[id]} active={current === id} onSelect={() => go(id)} />
  ));
  return (
    <div className="app lab" data-tpl={tpl.id} data-nav={tpl.nav} data-view={current}>
      <button type="button" className="skip" onClick={() => { const el = document.getElementById('results') || document.querySelector('main'); el?.focus(); el?.scrollIntoView(); }}>{T.skip}</button>
      <header className="labbar">
        <div className="labbrand">
          <h1>{T.brand}</h1>
          <p>{T.tagline}</p>
        </div>
        <span className="labtag">{`${T.lab.preview}: ${tpl.name}`}</span>
        <div className="labbar-right">
          {badges}
          <button type="button" className="link lab-link" onClick={() => go('gallery')}>{T.lab.gallery}</button>
        </div>
      </header>
      <div className="labbody">
        <nav className="hud" aria-label={T.lab.tools.explore}>
          <div className="hud-group hud-tools" ref={toolsRef} />
          <div className="hud-spacer" />
          <div className="hud-group hud-pages">
            {pageButtons}
            <HudButton id="settings" icon="sliders" label={T.lab.tools.settings} drawer />
          </div>
        </nav>
        <div className="hud-drawer-slot" ref={drawerRef} />
        <div className="labmain">{children}</div>
      </div>
      <HudDrawer id="settings" title={T.lab.tools.settings}>
        <div className="drawer-stack">{designPick}{themePick}</div>
      </HudDrawer>
    </div>
  );
}
