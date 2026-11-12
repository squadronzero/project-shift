// The Explore page: map on one side, the story of the chosen area on the other.
// Layout and order of the sections can be changed freely; the numbers come from lib/.
import { useEffect, useMemo, useRef, useState } from 'react';
import T, { MONTHS_LONG, fmtDate, fmtDay } from '../content/text.js';
import PLACES from '../content/places.js';
import MapView from '../components/MapView.jsx';
import MapBoundary from '../components/MapBoundary.jsx';
import MapLegend from '../components/MapLegend.jsx';
import CellPanel from '../components/CellPanel.jsx';
import RecentPanel from '../components/RecentPanel.jsx';
import RecentLegend from '../components/RecentLegend.jsx';
import AreaPicker from '../components/AreaPicker.jsx';
import ChartCard from '../components/ChartCard.jsx';
import Calendar, { calendarLegend } from '../components/Calendar.jsx';
import MonthGrid from '../components/MonthGrid.jsx';
import Trend from '../components/Trend.jsx';
import Compare from '../components/Compare.jsx';
import WeatherContext from '../weather/WeatherContext.jsx';
import Season from '../components/Season.jsx';
import Downloads from '../components/Downloads.jsx';
import { HudButton, HudDrawer, HudTools, Icon } from '../lab/Hud.jsx';
import { MAX_TILES, areaSeries, dateOf, iso, json, lastDataDay, monthLayer, tilesOfCells, dayIndex, zoneMonth } from '../lib/data.js';
import { IMAGERY_FIRST_DAY, cellInfo, days_in_month, imagery } from '../lib/geo.js';
import { areaFromSpec, boxArea, pointArea, presetArea } from '../lib/area.js';
import { detectionInfo, minuteToIso, recentFreshness, recentOverview, recentPoints, recentStatus, tilesInView } from '../lib/recent.js';
import { RECENT_POINTS_FROM } from '../components/MapView.jsx';
import { areaRange, compareWindow, monthly, normalMonth, season, summary } from '../lib/analysis.js';
import { slug } from '../lib/downloads.js';
import { fmt } from '../lib/format.js';
import { writeHash } from '../lib/url.js';

export default function Explore({ meta, theme, params, tpl = null, go }) {
  const lastK = lastDataDay(meta);
  const lastIso = iso(meta, lastK);
  // the map opens on the last complete month
  const [month, setMonth] = useState(() => params.m || (() => {
    const d = new Date(Date.UTC(+lastIso.slice(0, 4), +lastIso.slice(5, 7) - 2, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  })());
  const [fires, setFires] = useState(null);
  const [notFire, setNotFire] = useState(null);
  const [showNotFire, setShowNotFire] = useState(false);
  // no area in the link: the page opens on the world map with nothing chosen (13 Nov). An area in the link that
  // does not exist also leaves nothing chosen, and says so
  const [area, setArea] = useState(() => areaFromSpec(params.area, PLACES) || null);
  const badArea = !!(params.area && !areaFromSpec(params.area, PLACES));
  const example = PLACES.find((p) => p.id === 'bangladesh') || PLACES[0];
  const [drawing, setDrawing] = useState(false);
  const [variable, setVariable] = useState(params.v === 'frp' ? 'frp' : 'cells');
  const [series, setSeries] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(() => (badArea ? T.area.notFound(params.area) : null));
  const [unc, setUnc] = useState(null);
  const [harm, setHarm] = useState(null);
  const [cloud, setCloud] = useState(null);
  const [checks, setChecks] = useState(null);
  const [cmpMode, setCmpMode] = useState(params.from ? 'custom' : 'month');
  const [dates, setDates] = useState(() => ({
    from: params.from || `${lastIso.slice(0, 4)}-01-01`, to: params.to || lastIso }));

  // ---- map view: 2D or 3D, backdrop, gaps, the clicked cell, playback (none of these change a value)
  // UI lab: the cinematic designs open on the globe unless the link says otherwise
  const [view, setView] = useState(params.p === '3d' || (!params.p && tpl?.globe) ? '3d' : '2d');
  const [basemap, setBasemap] = useState({ sat: 'satellite', day: 'daily' }[params.b] || 'standard');
  const [dayOfMonth, setDayOfMonth] = useState(15);
  const [showGaps, setShowGaps] = useState(false);
  const [gaps, setGaps] = useState(null);
  const [picked, setPicked] = useState(null);
  const [resetKey, setResetKey] = useState(0);
  const [focusKey, setFocusKey] = useState(0);
  const [toolsOpen, setToolsOpen] = useState(false);   // map settings on phones: closed by default
  useEffect(() => {                   // Escape closes the phone map settings and returns focus to their button
    if (!toolsOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { setToolsOpen(false); document.querySelector('.maptools-toggle')?.focus(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toolsOpen]);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1000);
  const [mapNote, setMapNote] = useState(null);
  const [mapOk, setMapOk] = useState(true);
  // variant A (12 Nov): the legend starts closed on every screen size, behind the same "Map key" button phones use
  const [legendOpen, setLegendOpen] = useState(false);
  // ---- recent detections (D38): a separate layer of raw FIRMS NRT points, never mixed into the record
  const [layerMode, setLayerMode] = useState(params.l === 'recent' ? 'recent' : 'record');
  const [period, setPeriod] = useState(['24h', '7d', 'all'].includes(params.rp) ? params.rp : '7d');
  const [rStatus, setRStatus] = useState(undefined);         // undefined: not checked yet, null: not available
  const [rCells, setRCells] = useState(null);
  const [rPts, setRPts] = useState(null);
  const [rView, setRView] = useState(null);
  const [rPicked, setRPicked] = useState(null);
  const [rNote, setRNote] = useState(null);
  const reducedMotion = useMemo(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false, []);
  // ---- UI lab (14 Nov): presentation-only state of the lab designs. None of it changes a value
  const [inspector, setInspector] = useState(true);        // the research panel (story column) open or closed
  const [sheet, setSheet] = useState('peek');              // phones: the research panel as a bottom sheet
  const [display, setDisplay] = useState('grid');          // 0.25 degree cells, smooth overview or 3D blocks
  const [quality, setQuality] = useState('standard');      // performance: no flights, no smoothing or blocks
  const [evTab, setEvTab] = useState('overview');
  const perf = quality === 'performance';
  const shownDisplay = perf ? 'grid' : display;
  const [wide, setWide] = useState(() => window.matchMedia?.('(min-width: 901px)').matches ?? true);
  useEffect(() => {
    const q = window.matchMedia?.('(min-width: 901px)');
    if (!q) return undefined;
    const f = (e) => setWide(e.matches);
    q.addEventListener('change', f);
    return () => q.removeEventListener('change', f);
  }, []);

  useEffect(() => {
    json('uncertainty.json').then(setUnc).catch(() => {});
    json('validation/report_harmonise.json').then(setHarm).catch(() => {});
    json('cloud.json').then(setCloud).catch(() => {});
    json('validation/report_checks.json').then(setChecks).catch(() => {});
  }, []);
  useEffect(() => {
    let live = true;
    monthLayer(month).then((f) => { if (live) setFires(f); }).catch(() => { if (live) setFires(null); });
    return () => { live = false; };
  }, [month]);
  // satellite availability per 30-degree zone for the map month (for the gap hatching and the cell panel)
  useEffect(() => {
    if (!showGaps && !picked) return undefined;
    let live = true;
    zoneMonth(meta, month).then((g) => { if (live) setGaps(g); }).catch(() => {});
    return () => { live = false; };
  }, [meta, month, showGaps, picked != null]);  // eslint-disable-line react-hooks/exhaustive-deps

  // playback: one published month after another (no in-between frames), then stop at the last one
  const monthRef = useRef(month);
  monthRef.current = month;
  useEffect(() => {
    if (!playing) return undefined;
    const t = setInterval(() => {
      const i = months.indexOf(monthRef.current);
      if (i < 0 || i >= months.length - 1) { setPlaying(false); return; }
      if (i + 2 < months.length) monthLayer(months[i + 2]).catch(() => {});   // fetch the next file early
      setMonth(months[i + 1]);
    }, reducedMotion ? Math.max(speed, 2000) : speed);
    return () => clearInterval(t);
  }, [playing, speed]);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { recentStatus().then(setRStatus); }, []);
  const [rUpdating, setRUpdating] = useState(false);                // files of two updates: show nothing (audit D1)
  const [nowTick, setNowTick] = useState(() => Date.now());          // re-judge "not current" every 5 minutes
  useEffect(() => { const id = setInterval(() => setNowTick(Date.now()), 300000); return () => clearInterval(id); }, []);
  const rFresh = useMemo(() => recentFreshness(rStatus, nowTick), [rStatus, nowTick]);
  useEffect(() => {
    if (layerMode !== 'recent' || !rStatus) return undefined;
    let live = true;
    if (rStatus.updating) { setRCells(null); setRUpdating(true); return undefined; }
    recentOverview(rStatus, period).then((o) => { if (live) { setRCells(o); setRUpdating(false); } })
      .catch(() => { if (live) { setRCells(null); setRUpdating(true); } });
    return () => { live = false; };
  }, [layerMode, period, rStatus]);
  // single detections only for the tiles in view, and only when zoomed in
  const rTiles = useMemo(() => (layerMode === 'recent' && rStatus && rView && rView.zoom >= RECENT_POINTS_FROM - 0.5
    ? tilesInView(rView.bounds, rStatus.tiles, 6) : []), [layerMode, rStatus, rView]);
  const rTileKey = rTiles.join(',');
  useEffect(() => {
    if (!rTiles.length || !rCells) { setRPts(null); setRNote(null); return undefined; }
    let live = true;
    setRNote(T.recent.loading);
    recentPoints(rStatus, rTiles, period, rCells.latest).then((f) => {
      if (live) { setRPts(f); setRNote(f.missing ? T.recent.tilesMissing : null); }
    }).catch(() => { if (live) setRNote(T.recent.tilesMissing); });
    return () => { live = false; };
  }, [rTileKey, period, rCells]);  // eslint-disable-line react-hooks/exhaustive-deps
  const recentTip = (layer, p) => (layer === 'recent-cells'
    ? T.recent.cellTip(+p.n, +p.fmax)
    : rCells && T.recent.pointTip(detectionInfo({ ...p, lat: +p.lat, lon: +p.lon, frp: +p.frp, nf: +p.nf, minute: +p.minute }, rCells.from)));
  const rInfo = rPicked && rCells ? detectionInfo(rPicked, rCells.from) : null;

  useEffect(() => {
    if (!showNotFire || notFire) return;
    json('notfire.json').then((d) => setNotFire({ type: 'FeatureCollection', features: d.cells.map(([lat, lon, type, years]) =>
      ({ type: 'Feature', geometry: { type: 'Point', coordinates: [lon, lat] }, properties: { type, years } })) })).catch(() => {});
  }, [showNotFire, notFire]);

  // the share link follows every choice
  useEffect(() => {
    writeHash('explore', { ...(tpl ? { t: tpl.id } : {}), area: area?.spec, v: variable, m: month, ...(cmpMode === 'custom' ? { from: dates.from, to: dates.to } : {}),
      ...(view === '3d' ? { p: '3d' } : {}), ...(basemap !== 'standard' ? { b: basemap === 'satellite' ? 'sat' : 'day' } : {}),
      ...(layerMode === 'recent' ? { l: 'recent', rp: period } : {}) });
  }, [area, variable, month, dates, cmpMode, view, basemap, layerMode, period]);

  const tileCount = useMemo(() => (area ? tilesOfCells(area.cells).filter((t) => meta.tiles[t.name]).length : 0), [area, meta]);
  useEffect(() => {
    if (!area) { setSeries(null); setLoading(false); return undefined; }
    if (tileCount > MAX_TILES) { setSeries(null); setError(T.area.tooBig(tileCount, MAX_TILES)); return undefined; }
    let live = true;
    setLoading(true);
    areaSeries(meta, area).then((s) => { if (live) { setSeries(s); setLoading(false); } })
      .catch(() => { if (live) { setSeries(null); setLoading(false); setError(T.loadError); } });
    return () => { live = false; };
  }, [meta, area, tileCount]);

  const mon = useMemo(() => (series ? monthly(meta, series, variable, cloud) : null), [meta, series, variable, cloud]);
  const range = useMemo(() => (series && unc ? areaRange(unc, series.fineW, variable) : null), [series, unc, variable]);
  const sea = useMemo(() => (series ? season(meta, series, variable) : null), [meta, series, variable]);
  const win = useMemo(() => {
    if (cmpMode === 'month') return [dayIndex(meta, `${lastIso.slice(0, 7)}-01`), lastK];
    if (cmpMode === 'last30') return [lastK - 29, lastK];
    return [Math.max(0, dayIndex(meta, dates.from)), Math.min(lastK, dayIndex(meta, dates.to))];
  }, [cmpMode, dates, meta, lastK, lastIso]);
  const cmp = useMemo(() => (series ? compareWindow(meta, series, variable, win[0], win[1], range) : null),
    [meta, series, variable, win, range]);
  const monthShare = useMemo(() => {
    if (!mon || !cmp?.target || cmpMode !== 'month') return null;
    const n = normalMonth(mon, dateOf(meta, cmp.target.from).getUTCMonth());
    return n > 0 ? cmp.target.value / n : null;
  }, [mon, cmp, cmpMode, meta]);

  const months = useMemo(() => {
    const out = [];
    const s = new Date(meta.start + 'T00:00:00Z'), e = new Date(meta.end + 'T00:00:00Z');
    for (let d = new Date(s); d <= e; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)))
      out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
    return out;
  }, [meta]);

  const onBox = (b) => { setError(null); setPlaying(false); setArea(boxArea(b)); };
  const pickArea = (a) => { setError(null); setPlaying(false); setArea(a); };
  const pickMonth = (m) => { setPlaying(false); setMonth(m); };
  // the start screen's one-tap example: the first tested preset over the latest month of the record
  const showExample = () => { setCmpMode('month'); pickArea(presetArea(example)); };
  const exampleLabel = T.area.start.example(example.name, MONTHS_LONG[+lastIso.slice(5, 7) - 1], lastIso.slice(0, 4));
  // UI lab shell (TIME-02): a click in the calendar, month grid or trend moves the map to that month
  const pickFromChart = (m, day) => { if (!months.includes(m)) return; pickMonth(m); if (day) setDayOfMonth(day); };
  const syncNote = (what) => (
    <p className="small mapsync" aria-live="polite">{layerMode === 'recent' ? T.sync.recent(what)
      : T.sync.hint(what, `${MONTHS_LONG[+month.slice(5, 7) - 1]} ${month.slice(0, 4)}`)}</p>
  );

  // the picture date follows the map month (clamped to the month and to the last data day)
  const imageryDay = useMemo(() => {
    const d = `${month}-${String(Math.min(dayOfMonth, days_in_month(month))).padStart(2, '0')}`;
    return d > lastIso ? lastIso : d;
  }, [month, dayOfMonth, lastIso]);
  const img = basemap === 'standard' ? null : imagery(basemap, imageryDay);
  useEffect(() => { setMapNote(basemap === 'daily' && !img ? T.map.imageryTooEarly : null); }, [basemap, img?.id]);  // eslint-disable-line react-hooks/exhaustive-deps

  // the clicked cell, read again from the current month's file whenever the month changes
  const pickInfo = useMemo(() => {
    if (!picked) return null;
    const f = fires?.features.find((x) => x.properties.lon === picked.lon && x.properties.lat === picked.lat);
    return cellInfo({ lon: picked.lon, lat: picked.lat, cells: f ? f.properties.cells : 0, frp: f ? f.properties.frp : 0 },
      month, { unc, cloud, zoneDays: gaps ? gaps[Math.floor((picked.lat + 90) / 30) * 12 + Math.floor((picked.lon + 180) / 30)] : null });
  }, [picked, fires, month, unc, cloud, gaps]);

  const mapSummary = useMemo(() => {
    if (!fires) return '';
    let frp = 0, cl = 0;
    for (const f of fires.features) { frp += f.properties.frp; cl += f.properties.cells; }
    return T.map.summary(month, fires.features.length, Math.round(frp), Math.round(cl), T.map.views[view]);
  }, [fires, month, view]);
  const falseAlarm = checks?.anomaly_rule?.regions?.plain?.false_alarm_pct ?? harm?.anomaly_rule?.plain?.false_alarm_pct ?? 27;
  const totals = mon && summary(mon.rows);
  const file = (what) => `shift_${slug(area?.name || 'area')}_${what}`;
  const mLabel = T.measures[variable];

  // ---- the parts of the page. The official layout assembles them below exactly as before (no `tpl`);
  // a UI lab design places the same parts in its own frame (drawers, a time dock and a research panel).
  const summaryFacts = cmp?.target && !loading ? (
    <div className="facts compact">
      <p><b>{fmt(cmp.target.value, variable)}</b><span>{T.compare.modes[cmpMode]}</span></p>
      <p><b>{T.compare.vsMedian(cmp.ratio)}</b><span>{T.summary.sameDates}</span></p>
      <p><b>{cmp.rank ? `#${cmp.rank}` : '–'}</b><span>{cmp.rank ? T.summary.rankOf(cmp.of) : ''}</span></p>
    </div>
  ) : <p className="small muted">{loading ? T.loading : ''}</p>;
  const summaryPeriods = cmp?.target && <p className="small">{T.summary.periods(fmtDay(dateOf(meta, cmp.target.from)), fmtDay(dateOf(meta, cmp.target.to)),
    layerMode === 'recent' ? T.summary.mapRecent : T.summary.mapMonth(MONTHS_LONG[+month.slice(5, 7) - 1], month.slice(0, 4)))}</p>;
  const mobileSummary = !area ? <section className="mobile-summary" aria-label={T.summary.label}>
    <h2>{T.area.start.heading}</h2>
    <p className="small">{T.area.start.mobile}</p>
    <p><button type="button" className="action" onClick={showExample}>{exampleLabel}</button></p>
  </section> : <section className="mobile-summary" aria-label={T.summary.label}>
    <h2>{area.name}</h2>
    {summaryFacts}
    {summaryPeriods}
  </section>;

  // the camera padding keeps the chosen area clear of a floating research panel (lab designs)
  const camPadding = tpl && wide && inspector && tpl.inspector === 'floating' ? { top: 60, bottom: 110, left: 90, right: 460 } : 40;
  const mapView = (
    <MapBoundary onFail={() => setMapOk(false)}>
      <MapView key={`${theme.name}-${theme.tpl || ''}`} theme={theme} fires={fires} notFire={notFire} showNotFire={showNotFire}
        area={area} drawing={drawing} onBox={onBox} onDrawEnd={() => setDrawing(false)}
        onDateLine={() => setError(T.map.dateLine)}
        variable={variable} view={view} basemap={img ? basemap : 'standard'} imageryDay={imageryDay}
        gaps={gaps} showGaps={showGaps} picked={picked} onPick={(c) => { setPlaying(false); setPicked(c); }}
        resetKey={resetKey} focusKey={focusKey} reducedMotion={reducedMotion || perf}
        onImageryError={() => setMapNote(T.map.imageryOffline)}
        onStatus={(st) => { if (st === 'failed') setMapOk(false); else setMapNote(st === 'lost' ? T.map.contextLost : null); }}
        layerMode={layerMode} recentCells={layerMode === 'recent' ? rCells : null} recentPts={layerMode === 'recent' ? rPts : null}
        recentTip={recentTip} onViewChange={setRView}
        onRecentPick={(p) => { setPicked(null); setRPicked({ ...p, lat: +p.lat, lon: +p.lon, frp: +p.frp, nf: +p.nf, minute: +p.minute }); }}
        display={tpl ? shownDisplay : 'grid'} flight={tpl ? 1400 : 600} padding={camPadding} sky={!perf} />
    </MapBoundary>
  );
  const mapOverlays = <>
    {(mapNote || (layerMode === 'recent' && (rUpdating || rNote || rStatus === null))) && <p className="mapnote" role="status">
      {mapNote || (rUpdating ? T.recent.updating : rNote) || T.recent.unavailable}</p>}
    {layerMode === 'record' && <CellPanel info={pickInfo} onClose={() => setPicked(null)} />}
    {layerMode === 'recent' && <RecentPanel info={rInfo} onClose={() => setRPicked(null)}
      onHistory={() => { pickArea(pointArea(rPicked.lat, rPicked.lon, 50)); setRPicked(null); }} />}
    <details className="legendbox" open={legendOpen} onToggle={(e) => setLegendOpen(e.currentTarget.open)}>
      <summary>{T.map.legendToggle}</summary>
      {layerMode === 'recent'
        ? <RecentLegend theme={theme} zoomedIn={!!(rView && rView.zoom >= RECENT_POINTS_FROM)} status={rStatus} />
        : <MapLegend theme={theme} variable={variable} month={month} showGaps={showGaps} imageryLabel={img?.label} compact />}
      {tpl && layerMode === 'record' && shownDisplay !== 'grid' && <p className="small lab-displaynote">{T.lab.displayNote[shownDisplay]}</p>}
    </details>
    {/* the map is an empty box until its first layer arrives: say so in the middle of it (12 Nov) */}
    {(layerMode === 'record' ? !fires : (rStatus === undefined || (rStatus && !rCells && !rUpdating))) &&
      <p className="maploading" role="status">{layerMode === 'record' ? T.map.loading : T.recent.loadingLayer}</p>}
  </>;
  const mapControls = <>
    <label>{T.recent.layer}
      <select value={layerMode} onChange={(e) => { setPlaying(false); setPicked(null); setRPicked(null); setLayerMode(e.target.value); }}>
        {Object.entries(T.recent.layers).map(([k, l]) => <option key={k} value={k} disabled={k === 'recent' && rStatus === null}>{l}</option>)}
      </select>
    </label>
    <div className="seg" role="group" aria-label={T.map.view}>
      {['2d', '3d'].map((v) => <button key={v} type="button" className={view === v ? 'on' : ''} aria-pressed={view === v}
        onClick={() => setView(v)}>{T.map.views[v]}</button>)}
    </div>
    <label>{T.map.basemap}
      <select value={basemap} onChange={(e) => setBasemap(e.target.value)}>
        {Object.entries(T.map.basemaps).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
    </label>
    {basemap === 'daily' && <label>{T.map.imageryDay}
      <select value={Math.min(dayOfMonth, days_in_month(month))} onChange={(e) => setDayOfMonth(+e.target.value)}>
        {Array.from({ length: days_in_month(month) }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{fmtDate(`${month}-${String(d).padStart(2, '0')}`)}</option>)}
      </select>
    </label>}
    <button type="button" className="action ghost" disabled={!area} onClick={() => setFocusKey((k) => k + 1)}>{T.map.focus}</button>
    <button type="button" className="action ghost" onClick={() => setResetKey((k) => k + 1)}>{T.map.reset}</button>
  </>;
  const mapbar = layerMode === 'recent' ? <div className="mapbar">
    <label>{T.recent.period}
      <select value={period} onChange={(e) => setPeriod(e.target.value)}>
        {Object.entries(T.recent.periods).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
    </label>
    {rStatus && rCells && <span className="small">{T.recent.fetched(rStatus.fetched_utc,
      rStatus.window.from, minuteToIso(rCells.from, rCells.latest), rFresh?.stale)}</span>}
    {rFresh && (rFresh.stale || rFresh.feedLagHours || rFresh.incomplete) && <div className={rFresh.stale ? 'recentnotice warn' : 'recentnotice'} role="status">
      {rFresh.stale && <p>{T.recent.stale(rFresh.retrieved, Math.max(0, Math.round((nowTick - Date.parse(rStatus.fetched_utc)) / 3.6e6)))}{rFresh.attempted ? ` ${T.recent.fallback(rFresh.attempted)}` : ''}</p>}
      {rFresh.feedLagHours && <p>{T.recent.feedLag(rFresh.feedLagHours)}</p>}
      {rFresh.incomplete && <p>{T.recent.missing(rFresh.missing.map(T.recent.missingItem).join(', ') || 'an unknown part')}</p>}
    </div>}
    {rStatus && rView && rView.zoom < RECENT_POINTS_FROM && <span className="small muted">{T.recent.zoomHint}</span>}
    <label className="check"><input type="checkbox" checked={showNotFire} onChange={(e) => setShowNotFire(e.target.checked)} />
      {T.map.notFire}</label>
  </div> : <div className="mapbar">
    <label>{T.map.month}
      <select value={month} onChange={(e) => pickMonth(e.target.value)}>
        {months.slice().reverse().map((m) => <option key={m} value={m}>{fmtDate(m)}</option>)}
      </select>
    </label>
    {mapOk && <>
    <button type="button" className="action" aria-pressed={playing}
      onClick={() => { if (!playing && month === months[months.length - 1]) setMonth(months[0]); setPlaying(!playing); }}>
      {playing ? `❚❚ ${T.map.pause}` : `▶ ${T.map.play}`}</button>
    <label>{T.map.speed}
      <select value={speed} onChange={(e) => setSpeed(+e.target.value)}>
        {Object.entries(T.map.speeds).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
    </label>
    <label className="check"><input type="checkbox" checked={showGaps} onChange={(e) => setShowGaps(e.target.checked)} />
      {T.map.gaps}</label>
    <label className="check"><input type="checkbox" checked={showNotFire} onChange={(e) => setShowNotFire(e.target.checked)} />
      {T.map.notFire}</label>
    {showNotFire && <span className="kinds">
      <span className="swatch round" style={{ background: theme.industry }} /> {T.map.kinds.industry}
      <span className="swatch round" style={{ background: theme.volcano }} /> {T.map.kinds.volcano}
      <span className="swatch round" style={{ background: theme.offshore }} /> {T.map.kinds.offshore}
    </span>}
    </>}
  </div>;
  /* what the map shows (12 Nov): these sentences used to sit inside the legend and covered the map */
  const mapnotes = mapOk && layerMode === 'record' && <p className="mapnotes small">{T.map.legendUnit[variable]}. {T.map.legendScale} {T.map.legendSupport}
    {showGaps ? ` ${T.map.legendGaps}` : ''}{img ? ` ${img.label}. ${T.map.imageryNote}` : ''}</p>;
  const controls = (
    <div className="controls">
      <AreaPicker area={area} setArea={pickArea} drawing={drawing} setDrawing={setDrawing} setError={setError} />
      <div className="seg" role="group" aria-label="Measure">
        {['cells', 'frp'].map((v) => <button key={v} className={variable === v ? 'on' : ''} aria-pressed={variable === v}
          onClick={() => setVariable(v)}>{T.measures[v]}</button>)}
      </div>
      <details className="define"><summary>{T.whatIsHotspot}</summary><p>{T.hotspotDefinition}</p></details>
    </div>
  );
  const storyBody = <>
    {error && <p className="notice" role="alert">{error}</p>}

    <div className="print-only print-head">
      <b>{T.brand}</b> · {T.dataTo(fmtDay(dateOf(meta, lastK)))} · printed {new Date().toISOString().slice(0, 10)} · {location.href}
    </div>
    {!area && <div className="start-empty">
      <h2>{T.area.start.heading}</h2>
      <p className="lede">{T.area.start.body}</p>
      <p><button type="button" className="action" onClick={showExample}>{exampleLabel}</button></p>
    </div>}
    {area && <>
    <h2>{area.name}</h2>
    <p className="small">{area.tested ? `${T.area.tested} ` : ''}{T.area.edgeNote}</p>
    {tpl && !loading && <div className="lab-peek">{summaryFacts}{summaryPeriods}</div>}
    {loading && <p className="muted">{T.loading}</p>}
    {!loading && series && series.tiles === 0 && <p className="muted">{T.noFire}</p>}
    {!loading && series && mon && series.tiles > 0 && (
      <>
        <p className="lede">{T.lede(totals.unusual, totals.critical, mon.baseline[0], mon.baseline[1], totals.nodataDays)}</p>

        <ChartCard id="card-now" title={T.headings.now} file={file('compare')} theme={theme} imageTitle={`${area.name}: ${mLabel.toLowerCase()}, same dates every year`}>
          <Compare meta={meta} cmp={cmp} variable={variable} theme={theme} mode={cmpMode} setMode={setCmpMode} monthShare={monthShare}
            dates={dates} setDates={setDates} />
          <WeatherContext meta={meta} cmp={cmp} area={area} />
        </ChartCard>

        <ChartCard id="card-season" title={T.headings.season} file={file('season')} theme={theme} imageTitle={`${area.name}: the usual fire season`}>
          <Season meta={meta} sea={sea} theme={theme} />
        </ChartCard>

        <ChartCard id="card-calendar" title={T.headings.calendar} file={file('calendar')} theme={theme} legend={calendarLegend(theme)}
          imageTitle={`${area.name}: daily ${mLabel.toLowerCase()}, ${meta.start.slice(0, 4)} to ${lastIso.slice(0, 4)}`}>
          <Calendar meta={meta} series={series} variable={variable} theme={theme}
            mapMonth={layerMode === 'record' ? month : null} onPickMonth={pickFromChart} syncNote={syncNote(T.sync.day)} />
        </ChartCard>

        <ChartCard id="card-months" title={T.headings.months} file={file('months')} theme={theme} imageTitle={`${area.name}: each month against its normal (${mLabel.toLowerCase()})`}
          note={T.monthGrid.classMeaning}>
          <MonthGrid monthly={mon} variable={variable} theme={theme} falseAlarm={falseAlarm} recordEnd={fmtDay(dateOf(meta, lastK))}
            mapMonth={layerMode === 'record' ? month : null} onPickMonth={pickFromChart} syncNote={syncNote(T.sync.month)} />
        </ChartCard>

        <ChartCard id="card-trend" title={T.headings.trend} file={file('trend')} theme={theme} imageTitle={`${area.name}: monthly ${mLabel.toLowerCase()}`}
          note={T.explainShort} about={T.explainScale}>
          <Trend monthly={mon} range={range} variable={variable} theme={theme}
            mapMonth={layerMode === 'record' ? month : null} onPickMonth={pickFromChart} syncNote={syncNote(T.sync.month)} />
        </ChartCard>

        <section className="card no-print" id="card-downloads">
          <h3>{T.headings.downloads}</h3>
          <Downloads meta={meta} area={area} series={series} mon={mon} range={range} unc={unc} variable={variable}
            dates={dates} setDates={(d) => { setDates(d); setCmpMode('custom'); }} />
        </section>
      </>
    )}
    </>}
  </>;

  if (!tpl) {
    return (
      <main className="explore">
        {/* phones only (hidden by CSS above 900px): the result first. Same numbers as "Now against the past", not recomputed */}
        {mobileSummary}
        <section className="mapside">
          <div className="mapstage">
          {mapView}

          {mapOk && <>
          <button type="button" className="maptools-toggle" aria-expanded={toolsOpen} aria-controls="maptools"
            onClick={() => setToolsOpen((o) => !o)}>
            <span aria-hidden="true">⚙</span><span>{T.map.settingsButton(T.recent.layers[layerMode], T.map.views[view])}</span>
          </button>
          {mapOverlays}
          </>}
          </div>
          {mapOk && <>
          <div id="maptools" className={toolsOpen ? 'maptools open' : 'maptools'} role="toolbar" aria-label={T.map.view}>
            {mapControls}
            <button type="button" className="action done" onClick={() => { setToolsOpen(false); document.querySelector('.maptools-toggle')?.focus(); }}>{T.map.done}</button>
          </div>
          </>}
          <p className="visually-hidden" aria-live="polite">{mapSummary}</p>

          {mapbar}
          {mapnotes}
        </section>

        <section className="story" id="results" tabIndex={-1} aria-live="polite">
          {controls}
          {storyBody}
        </section>
      </main>
    );
  }

  // ---------------------------------------------------------------- UI lab design (14 Nov)
  const smooth = !(reducedMotion || perf);
  const openTo = (id) => {
    setInspector(true);
    if (!wide) setSheet((s) => (s === 'peek' ? 'half' : s));
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'auto' }), 60);
  };
  const L = T.lab;
  return (
    <main className="explore lab-explore" data-inspector={inspector ? 'open' : 'closed'} data-sheet={sheet} data-quality={quality}>
      <HudTools>
        <HudButton id="area" icon="pin" label={L.tools.area} drawer />
        <HudButton id="layers" icon="layers" label={L.tools.layers} drawer />
        <HudButton id="calendars" icon="calendar" label={L.tools.calendar} drawer />
        <HudButton id="research" icon="chart" label={inspector ? L.closePanel : L.openPanel} active={inspector}
          onSelect={() => setInspector((o) => !o)} />
        <HudButton id="evidence" icon="check" label={L.tools.validation} drawer />
        <HudButton id="export" icon="download" label={L.tools.export} onSelect={() => openTo(area ? 'card-downloads' : 'results')} />
      </HudTools>

      <HudDrawer id="area" title={L.tools.area}>
        {controls}
        <div className="lab-notyet" role="note">
          <b>{L.areaNotYet}</b>
          <ul>{L.areaNotYetItems.map((x) => <li key={x}>{x}</li>)}</ul>
          <p className="small">{L.areaNotYetWhy}</p>
        </div>
      </HudDrawer>
      <HudDrawer id="layers" title={L.tools.layers}>
        <div className="drawer-stack">
          {mapOk ? mapControls : <p className="small">{T.map.mapFailed}</p>}
          <div className="seg grid3" role="group" aria-label={L.display}>
            {Object.entries(L.displays).map(([k, l]) => <button key={k} type="button" className={shownDisplay === k ? 'on' : ''}
              aria-pressed={shownDisplay === k} disabled={perf && k !== 'grid'} onClick={() => setDisplay(k)}>{l}</button>)}
          </div>
          <p className="small">{L.displayNote[shownDisplay]}</p>
          <label>{L.quality}
            <select value={quality} onChange={(e) => setQuality(e.target.value)}>
              {Object.entries(L.qualities).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
          <p className="small">{L.qualityNote}</p>
        </div>
      </HudDrawer>
      <HudDrawer id="calendars" title={L.tools.calendar}>
        <div className="drawer-stack">
          {area && series ? <>
            <button type="button" className="action ghost" onClick={() => openTo('card-calendar')}>{L.calendars.daily}</button>
            <button type="button" className="action ghost" onClick={() => openTo('card-months')}>{L.calendars.months}</button>
            <button type="button" className="action ghost" onClick={() => openTo('card-now')}>{L.calendars.compare}</button>
            <p className="small">{L.calendarsNote}</p>
          </> : <p className="small">{T.area.start.body}</p>}
          <p className="small lab-notyet-inline">{L.compareTwo}</p>
        </div>
      </HudDrawer>
      <HudDrawer id="evidence" title={L.tools.validation}>
        <div className="seg grid3" role="tablist" aria-label={L.tools.validation}>
          {Object.entries(L.evidence).map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={evTab === k}
            className={evTab === k ? 'on' : ''} onClick={() => setEvTab(k)}>{l}</button>)}
        </div>
        <div className="drawer-stack" role="tabpanel">
          {evTab === 'overview' && <><p className="small">{L.evidenceOverview}</p><p className="small">{T.explainShort}</p></>}
          {evTab === 'evidence' && <p className="small">{L.evidenceEvidence}</p>}
          {evTab === 'limits' && <ul className="small lab-limits">
            <li>{T.monthGrid.classMeaning}</li>
            <li>{T.area.edgeNote}</li>
            <li>{T.recent.legendRaw}</li>
            <li>{L.notYet}</li>
          </ul>}
          <button type="button" className="action" onClick={() => go?.('validation')}>{L.openValidation}</button>
          <button type="button" className="action ghost" onClick={() => go?.('switch')}>{L.openSwitch}</button>
          <button type="button" className="action ghost" onClick={() => go?.('method')}>{L.openMethod}</button>
        </div>
      </HudDrawer>

      <section className="mapside">
        <div className="mapstage">
          {mapView}
          {mapOk && mapOverlays}
          {!area && <div className="lab-start" role="region" aria-label={L.startTitle}>
            <h2>{L.startTitle}</h2>
            <p className="small">{T.area.start.body}</p>
            <p className="lab-start-actions">
              <button type="button" className="action" onClick={showExample}>{exampleLabel}</button>
              <button type="button" className="action ghost" onClick={() => document.querySelector('[data-hud="area"]')?.click()}>{L.startOpen}</button>
            </p>
          </div>}
        </div>
        <p className="visually-hidden" aria-live="polite">{mapSummary}</p>
        <div className="lab-dock">{mapbar}</div>
        {mapnotes}
      </section>

      {inspector && <section className="story lab-inspector" id="results" tabIndex={-1} aria-live="polite" aria-label={L.tools.research}>
        <div className="lab-inspector-head">
          <b className="lab-inspector-title">{L.tools.research}</b>
          <div className="lab-sheet-ctl" role="group" aria-label={L.tools.research}>
            {['peek', 'half', 'full'].map((k) => <button key={k} type="button" className={sheet === k ? 'on' : ''} aria-pressed={sheet === k}
              onClick={() => setSheet(k)}>{L.sheet[k]}</button>)}
          </div>
          <button type="button" className="hud-close" onClick={() => setInspector(false)} aria-label={L.closePanel}><Icon name="close" size={16} /></button>
        </div>
        {storyBody}
      </section>}
    </main>
  );
}
