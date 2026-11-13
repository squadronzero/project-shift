// The app shell: header, navigation between views, the colour theme, and loading meta.json.
import { useEffect, useState } from 'react';
import T, { fmtDay } from './content/text.js';
import useTheme from './theme/useTheme.js';
import Explore from './pages/Explore.jsx';
import Switch2012 from './pages/Switch2012.jsx';
import Validation from './pages/Validation.jsx';
import Method from './pages/Method.jsx';
import { dateOf, json, lastDataDay } from './lib/data.js';

import { readHash, writeHash } from './lib/url.js';
import { recentFreshness, recentStatus, snapshotId } from './lib/recent.js';
import { checkAndReload, newerThanBefore } from './refresh.js';

const VIEWS = Object.keys(T.views);

export default function App() {
  const [theme] = useTheme();   // dark only in this lab variant
  const [{ view, params }] = useState(() => { const h = readHash(); return { view: VIEWS.includes(h.view) ? h.view : 'explore', params: h.params }; });
  const [current, setCurrent] = useState(view);
  const [meta, setMeta] = useState(null);
  const [recent, setRecent] = useState(null);
  const [recentDone, setRecentDone] = useState(false);
  useEffect(() => { recentStatus().then((r) => { setRecent(r); setRecentDone(true); }); }, []);
  const [error, setError] = useState(null);

  useEffect(() => { json('meta.json').then(setMeta).catch(() => setError(T.loadError)); }, []);
  // the brand: home and refresh (14 Nov). One check at a time; offline it only returns to Explore.
  const [busy, setBusy] = useState(false);
  const [exploreKey, setExploreKey] = useState(0);
  const [brandNote, setBrandNote] = useState(null);
  const home = async () => {
    if (busy) return;
    setBusy(true); setBrandNote(null);
    const reloaded = await checkAndReload({ meta: meta?.generated_utc || '', recent: snapshotId(recent) });
    if (!reloaded) {                       // offline: back to the Explore start, no reload, say so plainly
      setBusy(false); setCurrent('explore'); setExploreKey((k) => k + 1); history.replaceState(null, '', '#explore');
      setBrandNote(T.brandOffline);
    }
  };
  // after a reload from the brand: a note only when newer data was really loaded
  useEffect(() => {
    if (!meta || !recentDone) return;
    const n = newerThanBefore({ meta: meta.generated_utc || '', recent: snapshotId(recent) });
    if (n) setBrandNote(T.brandNewer(n.record, n.recent));
  }, [meta, recent, recentDone]);
  useEffect(() => { if (current !== 'explore') writeHash(current); }, [current]);

  return (
    <div className="app">
      {/* keyboard users: one stop before the map and its controls (12 Nov). A button, not a link, because the page
          address carries the view and the shared area, and a #results link would overwrite it. */}
      <button type="button" className="skip" onClick={() => { const el = document.getElementById('results') || document.querySelector('main'); el?.focus(); el?.scrollIntoView(); }}>{T.skip}</button>
      <header className="top">
        <div className="brand">
          <h1><button type="button" className="brandbtn" aria-label={T.brandAction} title={T.brandAction} onClick={home} disabled={busy}>{T.brand}</button></h1>
          <p>{T.tagline}</p>
        </div>
        <div className="top-right">
          {meta && <span className="badge">{T.dataTo(fmtDay(dateOf(meta, lastDataDay(meta))))}</span>}
          {recent?.latest_detection_utc && <span className={recentFreshness(recent)?.stale ? 'badge warn' : 'badge'}>{T.recentTo(recent.latest_detection_utc,
            recentFreshness(recent)?.stale)}</span>}
        </div>
        <nav aria-label="Views">
          {VIEWS.map((id) => (
            <button key={id} className={current === id ? 'tab on' : 'tab'} aria-current={current === id ? 'page' : undefined}
              onClick={() => setCurrent(id)}>{T.views[id]}</button>
          ))}
        </nav>
      </header>

      {brandNote && <p className="brandnote" role="status">{brandNote} <button type="button" className="linkbtn" onClick={() => setBrandNote(null)}>OK</button></p>}
      {error && <main className="page"><p className="notice" role="alert">{error}</p></main>}
      {current === 'explore' && meta && <Explore key={exploreKey} meta={meta} theme={theme} params={view === 'explore' && !exploreKey ? params : {}} />}
      {current === 'switch' && <Switch2012 theme={theme} />}
      {current === 'validation' && <Validation />}
      {current === 'method' && <Method meta={meta} />}
    </div>
  );
}
