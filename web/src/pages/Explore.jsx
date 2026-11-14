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
import SearchBar from '../components/SearchBar.jsx';
import FsInspector from '../components/FsInspector.jsx';
import HotspotCard from '../components/HotspotCard.jsx';
import { useFullscreen } from '../components/fullscreen.js';
import { cleanRing, polygonArea, polygonFromSpec } from '../components/polygon.js';
import ChartCard from '../components/ChartCard.jsx';
import Calendar, { calendarLegend } from '../components/Calendar.jsx';
import MonthGrid from '../components/MonthGrid.jsx';
import Trend from '../components/Trend.jsx';
import Compare from '../components/Compare.jsx';
import WeatherContext from '../weather/WeatherContext.jsx';
import Season from '../components/Season.jsx';
import Downloads from '../components/Downloads.jsx';
import { QUIET_MIN_HOTSPOTS_PER_YEAR, isQuietArea, normalYearHotspots } from '../components/quiet.js';
import { MAX_TILES, areaSeries, dateOf, iso, json, lastDataDay, monthLayer, tilesOfCells, dayIndex, zoneMonth } from '../lib/data.js';
import { IMAGERY_FIRST_DAY, cellInfo, days_in_month, imagery } from '../lib/geo.js';
import { COUNTRIES, areaFromSpec, boxArea, checkBox, countryArea, pointArea, presetArea } from '../lib/area.js';
import { detectionInfo, minuteToIso, recentFreshness, recentOverview, recentPoints, recentStatus, tilesInView } from '../lib/recent.js';
import { RECENT_POINTS_FROM } from '../components/MapView.jsx';
import { areaRange, compareWindow, monthly, normalMonth, season, summary } from '../lib/analysis.js';
import { slug } from '../lib/downloads.js';
import { fmt } from '../lib/format.js';
import { writeHash } from '../lib/url.js';

export default function Explore({ meta, theme, params, footer = null }) {
  const lastK = lastDataDay(meta);
  const lastIso = iso(meta, lastK);
  // the map opens on the newest month of the record, the same month the headline compares (14 Nov, judging audit:
  // the map showed the last complete month, September, next to an October headline). That month runs to the last
  // data day, and the label says so.
  const lastMonth = lastIso.slice(0, 7);
  const [month, setMonth] = useState(() => params.m || lastMonth);
  const [fires, setFires] = useState(null);
  const [notFire, setNotFire] = useState(null);
  const [showNotFire, setShowNotFire] = useState(false);
  // no area in the link: the page opens on the world map with nothing chosen (13 Nov). An area in the link that
  // does not exist also leaves nothing chosen, and says so
  // a box in a link gets the same check as typed coordinates (14 Nov, judging audit): a box across the date line
  // used to be read as an empty strip and showed "No fire was recorded"
  const linkArea = (spec) => {
    if (spec?.startsWith('poly:')) return polygonFromSpec(spec);
    if (spec?.startsWith('box:')) {
      const [w, s, e, n] = spec.slice(4).split(',').map(Number);
      if (checkBox({ w, s, e, n })) return null;
    }
    return areaFromSpec(spec, PLACES);
  };
  const [area, setArea] = useState(() => linkArea(params.area) || null);
  const badArea = !!(params.area && !linkArea(params.area));
  // the example is the Bangladesh COUNTRY view (14 Nov, judging audit P1): the preset box is a rectangle with about
  // two-thirds of its October 2026 fire in India and Myanmar, so it must not be quoted as "Bangladesh"
  const exampleCountry = COUNTRIES.find((c) => c.id === 'bangladesh');
  const exampleArea = () => (exampleCountry ? countryArea(exampleCountry) : presetArea(PLACES[0]));
  const exampleName = exampleCountry ? exampleCountry.name : PLACES[0].name;
  const [drawing, setDrawing] = useState(false);
  // a shape being drawn (UI lab, 14 Nov): how many corners so far, and the page's Finish / Undo / Cancel
  const [draftCorners, setDraftCorners] = useState(0);
  const [drawCmd, setDrawCmd] = useState(null);
  const drawCommand = useMemo(() => (op) => setDrawCmd({ op, at: Date.now() }), []);
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
  const [view, setView] = useState(params.p === '3d' ? '3d' : '2d');
  const [basemap, setBasemap] = useState({ sat: 'satellite', day: 'daily' }[params.b] || 'standard');
  const [dayOfMonth, setDayOfMonth] = useState(15);
  const [showGaps, setShowGaps] = useState(false);
  const [gaps, setGaps] = useState(null);
  const [picked, setPicked] = useState(null);
  const [resetKey, setResetKey] = useState(0);
  const [focusKey, setFocusKey] = useState(0);
  const [toolsOpen, setToolsOpen] = useState(false);   // map settings on phones: closed by default
  // fullscreen (14 Nov): the same map side, made to fill the screen; the inspector is the optional second level
  const mapsideRef = useRef(null);
  const [inspector, setInspector] = useState(false);
  const fs = useFullscreen(mapsideRef, { canEscape: () => !toolsOpen });
  const inspecting = fs.full && inspector;
  useEffect(() => {                   // Escape closes the phone map settings and returns focus to their button
    if (!toolsOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { setToolsOpen(false); document.querySelector('.maptools-toggle')?.focus(); } };
    // a click or tap outside the panel and its button closes it (Map View, 14 Nov)
    const onDown = (e) => { if (!e.target.closest?.('#maptools, .maptools-toggle')) setToolsOpen(false); };
    // phones: the settings open as a sheet below the map, so bring it into view
    if (window.innerWidth <= 600) requestAnimationFrame(() => document.getElementById('maptools')?.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' }));
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown); };
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
    writeHash('explore', { area: area?.spec, v: variable, m: month, ...(cmpMode === 'custom' ? { from: dates.from, to: dates.to } : {}),
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
  // Quiet areas are judged on hotspots whichever measure is shown (judging audit P1, 14 Nov).
  const monCells = useMemo(() => (series ? (variable === 'cells' ? mon : monthly(meta, series, 'cells')) : null), [meta, series, variable, mon]);
  const quiet = monCells ? isQuietArea(monCells) : false;
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
  const onPolygon = (pts) => {
    const c = cleanRing(pts);
    if (c.error) { setError(c.error); return; }
    setError(null); setPlaying(false); setArea(polygonArea(c.ring));
  };
  const pickArea = (a) => { setError(null); setPlaying(false); setArea(a); };
  const pickMonth = (m) => { setPlaying(false); setMonth(m); };
  // the start screen's one-tap example: Bangladesh (country) over the latest month of the record
  const showExample = () => { setCmpMode('month'); pickArea(exampleArea()); };
  const exampleLabel = T.area.start.example(exampleName, MONTHS_LONG[+lastIso.slice(5, 7) - 1], lastIso.slice(0, 4));

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

  // one search bar: in the story column normally, in the fullscreen bar while fullscreen is on
  const searchBar = <SearchBar area={area} setArea={pickArea} drawing={drawing} setDrawing={setDrawing} setError={setError}
    draftCorners={draftCorners} drawCommand={drawCommand} />;
  const ledeText = area && !loading && series && mon && series.tiles > 0 ? (quiet
    ? T.ledeQuiet(normalYearHotspots(monCells), QUIET_MIN_HOTSPOTS_PER_YEAR, totals.nodataDays)
    : T.lede(totals.unusual, totals.critical, mon.baseline[0], mon.baseline[1], totals.nodataDays)) : '';
  const F = T.fullscreen;

  return (
    <main className="explore">
      {/* phones only (hidden by CSS above 900px): the result first. Same numbers as "Now against the past", not recomputed */}
      {!area ? <section className="mobile-summary" aria-label={T.summary.label}>
        <h2>{T.area.start.heading}</h2>
        <p className="small">{T.area.start.mobile}</p>
        <p><button type="button" className="action" onClick={showExample}>{exampleLabel}</button></p>
      </section> : <section className="mobile-summary" aria-label={T.summary.label}>
        <h2>{area.name}</h2>
        {cmp?.target && !loading ? (
          <div className="facts compact">
            <p><b>{fmt(cmp.target.value, variable)}</b><span>{T.compare.modes[cmpMode]}</span></p>
            <p><b>{T.compare.vsMedian(cmp.ratio)}</b><span>{T.summary.sameDates}</span></p>
            <p><b>{cmp.rank ? `#${cmp.rank}` : '–'}</b><span>{cmp.rank ? T.summary.rankOf(cmp.of) : ''}</span></p>
          </div>
        ) : <p className="small muted">{loading ? T.loading : ''}</p>}
        {cmp?.target && <p className="small">{T.summary.periods(fmtDay(dateOf(meta, cmp.target.from)), fmtDay(dateOf(meta, cmp.target.to)),
          layerMode === 'recent' ? T.summary.mapRecent : T.summary.mapMonth(MONTHS_LONG[+month.slice(5, 7) - 1], month.slice(0, 4), month === lastMonth ? fmtDate(lastIso) : null))}</p>}
      </section>}
      <section ref={mapsideRef} className={fs.full ? `mapside fs fs-${fs.mode}` : 'mapside'}
        {...(fs.full ? { role: 'region', 'aria-label': F.workspace(view) } : {})}>
        {fs.full && <div className="fs-bar">
          <p className="fs-title"><b>{T.brand}</b> <span>{F.workspace(view)}{area ? ` · ${area.name}` : ''}</span></p>
          <div className="fs-search">{searchBar}</div>
          <button type="button" className="fs-btn" aria-pressed={inspector} title={F.inspectorHint} onClick={() => setInspector((o) => !o)}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 5h16v14H4z M14 5v14 M16.5 9h1.5 M16.5 12h1.5 M16.5 15h1.5" fill="none" stroke="currentColor" strokeWidth="1.7" /></svg>
            <span>{F.inspectorShort}</span><span className="visually-hidden"> ({F.inspector})</span></button>
          <button type="button" className="fs-btn fs-exit" data-fs-first aria-label={F.exit(view)} title={F.exit(view)} onClick={() => fs.exit()}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M9 4v5H4 M15 4v5h5 M9 20v-5H4 M15 20v-5h5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span aria-hidden="true">{F.exitShort}</span></button>
          {fs.mode === 'viewport' && <p className="visually-hidden" role="status">{F.windowNote}</p>}
        </div>}
        <div className="mapbody">
        <div className="mapstage">
        <MapBoundary onFail={() => setMapOk(false)}>
          <MapView key="map" theme={theme} fires={fires} notFire={notFire} showNotFire={showNotFire}
            area={area} drawing={drawing} onBox={onBox} onDrawEnd={() => { setDrawing(false); setDraftCorners(0); }}
            onPolygon={onPolygon} onDraft={setDraftCorners} drawCmd={drawCmd}
            onDateLine={() => setError(T.map.dateLine)}
            variable={variable} view={view} basemap={img ? basemap : 'standard'} imageryDay={imageryDay}
            gaps={gaps} showGaps={showGaps} picked={picked} onPick={(c) => { setPlaying(false); setPicked(c); }}
            resetKey={resetKey} focusKey={focusKey} reducedMotion={reducedMotion}
            onImageryError={() => setMapNote(T.map.imageryOffline)}
            onStatus={(st) => { if (st === 'failed') setMapOk(false); else setMapNote(st === 'lost' ? T.map.contextLost : null); }}
            layerMode={layerMode} recentCells={layerMode === 'recent' ? rCells : null} recentPts={layerMode === 'recent' ? rPts : null}
            recentTip={recentTip} onViewChange={setRView}
            onRecentPick={(p) => { setPicked(null); setRPicked({ ...p, lat: +p.lat, lon: +p.lon, frp: +p.frp, nf: +p.nf, minute: +p.minute }); }}
            layoutKey={`${fs.mode}|${inspecting}`} />
        </MapBoundary>

        {mapOk && <>
        {/* Map View (14 Nov): one small button, always visible; the settings open in a temporary panel */}
        <div className="maptop">
        <button type="button" className="maptools-toggle" aria-expanded={toolsOpen} aria-controls="maptools" aria-haspopup="dialog"
          onClick={() => setToolsOpen((o) => !o)}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 3 3 7.5l9 4.5 9-4.5L12 3z M3 12l9 4.5 9-4.5 M3 16.5 12 21l9-4.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>
          <b>{T.map.viewButton}</b>
          <span className="viewnow">{T.map.viewNow(view === '3d' ? '3D' : '2D', T.recent.layers[layerMode], basemap === 'standard' ? '' : T.map.basemaps[basemap])}</span>
          <span aria-hidden="true">▾</span>
        </button>
        {!fs.full && <button type="button" className="fs-enter" aria-label={F.enter(view)} title={F.enter(view)} aria-pressed="false"
          onClick={(e) => { setToolsOpen(false); fs.enter(e.currentTarget); }}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9V4h5 M20 9V4h-5 M4 15v5h5 M20 15v5h-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>}
        </div>

        {(mapNote || (layerMode === 'recent' && (rUpdating || rNote || rStatus === null))) && <p className="mapnote" role="status">
          {mapNote || (rUpdating ? T.recent.updating : rNote) || T.recent.unavailable}</p>}
        {!inspecting && layerMode === 'record' && <CellPanel info={pickInfo} onClose={() => setPicked(null)} />}
        {!inspecting && layerMode === 'recent' && <RecentPanel info={rInfo} onClose={() => setRPicked(null)}
          onHistory={() => { pickArea(pointArea(rPicked.lat, rPicked.lon, 50)); setRPicked(null); }} />}
        <details className="legendbox" open={legendOpen} onToggle={(e) => setLegendOpen(e.currentTarget.open)}>
          <summary>{T.map.legendToggle}</summary>
          {layerMode === 'recent'
            ? <RecentLegend theme={theme} zoomedIn={!!(rView && rView.zoom >= RECENT_POINTS_FROM)} status={rStatus} />
            : <MapLegend theme={theme} variable={variable} month={month} showGaps={showGaps} imageryLabel={img?.label} compact />}
        </details>
        {/* the map is an empty box until its first layer arrives: say so in the middle of it (12 Nov) */}
        {(layerMode === 'record' ? !fires : (rStatus === undefined || (rStatus && !rCells && !rUpdating))) &&
          <p className="maploading" role="status">{layerMode === 'record' ? T.map.loading : T.recent.loadingLayer}</p>}
        </>}
        {mapOk && <>
        <div id="maptools" className={toolsOpen ? 'maptools open' : 'maptools'} role="dialog" aria-label={T.map.view}>
          <div className="mt-head"><b>{T.map.viewButton}</b>
            <button type="button" className="mt-close" aria-label={T.map.closeView}
              onClick={() => { setToolsOpen(false); document.querySelector('.maptools-toggle')?.focus(); }}>×</button></div>
          <div className="mt-group" role="group" aria-label={T.recent.layer}>
            <span className="mt-label">{T.recent.layer}</span>
            <div className="seg">
              {Object.entries(T.recent.layers).map(([k, l]) => <button key={k} type="button" className={layerMode === k ? 'on' : ''} aria-pressed={layerMode === k}
                disabled={k === 'recent' && rStatus === null}
                onClick={() => { if (layerMode === k) return; setPlaying(false); setPicked(null); setRPicked(null); setLayerMode(k); }}>{l}</button>)}
            </div>
          </div>
          <div className="mt-group" role="group" aria-label={T.map.projection}>
            <span className="mt-label">{T.map.projection}</span>
            <div className="seg">
              {['2d', '3d'].map((v) => <button key={v} type="button" className={view === v ? 'on' : ''} aria-pressed={view === v}
                onClick={() => setView(v)}>{T.map.views[v]}</button>)}
            </div>
          </div>
          <div className="mt-group">
            <label className="mt-label" htmlFor="mt-basemap">{T.map.basemap}</label>
            <select id="mt-basemap" value={basemap} onChange={(e) => setBasemap(e.target.value)}>
              {Object.entries(T.map.basemaps).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            {basemap === 'daily' && <label>{T.map.imageryDay}
              <select value={Math.min(dayOfMonth, days_in_month(month))} onChange={(e) => setDayOfMonth(+e.target.value)}>
                {Array.from({ length: days_in_month(month) }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{fmtDate(`${month}-${String(d).padStart(2, '0')}`)}</option>)}
              </select>
            </label>}
          </div>
          <div className="mt-group" role="group" aria-label={T.map.camera}>
            <span className="mt-label">{T.map.camera}</span>
            <div className="mt-row">
              <button type="button" className="action ghost" disabled={!area} onClick={() => setFocusKey((k) => k + 1)}>{T.map.focus}</button>
              <button type="button" className="action ghost" onClick={() => setResetKey((k) => k + 1)}>{T.map.reset}</button>
            </div>
          </div>
          <button type="button" className="action done" onClick={() => { setToolsOpen(false); document.querySelector('.maptools-toggle')?.focus(); }}>{T.map.done}</button>
        </div>
        </>}
        </div>
        {inspecting && <FsInspector meta={meta} area={area} cmp={cmp} variable={variable} lede={ledeText} loading={loading}
          layerMode={layerMode} pickInfo={pickInfo} onClosePick={() => setPicked(null)}
          rInfo={rInfo} onCloseRecent={() => setRPicked(null)}
          onHistory={() => { pickArea(pointArea(rPicked.lat, rPicked.lon, 50)); setRPicked(null); }}
          onClose={() => setInspector(false)}
          onBack={() => fs.exit(document.getElementById('results'))} />}
        </div>
        <p className="visually-hidden" aria-live="polite">{mapSummary}</p>

        {layerMode === 'recent' ? <div className="mapbar">
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
          <label>{month === lastMonth ? T.map.monthTo(fmtDate(lastIso)) : T.map.month}
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
        </div>}
        {/* what the map shows (12 Nov): these sentences used to sit inside the legend and covered the map */}
        {mapOk && layerMode === 'record' && (() => {
          const notes = <p className="mapnotes small">{T.map.legendUnit[variable]}. {T.map.legendScale} {T.map.legendSupport}
            {showGaps ? ` ${T.map.legendGaps}` : ''}{img ? ` ${img.label}. ${T.map.imageryNote}` : ''}</p>;
          // fullscreen: the same sentences behind "About this map" (open on wide screens), so phones keep room for the map
          return fs.full ? <details className="fs-notes" open={window.matchMedia?.('(min-width: 701px)').matches}>
            <summary>{F.aboutMap}</summary>{notes}</details> : notes;
        })()}
      </section>

      <section className="story" id="results" tabIndex={-1} aria-live="polite">
        <div className="controls">
          {!fs.full && searchBar}
          <div className="seg" role="group" aria-label="Measure">
            {['cells', 'frp'].map((v) => <button key={v} className={variable === v ? 'on' : ''} aria-pressed={variable === v}
              onClick={() => setVariable(v)}>{T.measures[v]}</button>)}
          </div>
          <HotspotCard />
        </div>
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
        <p className="small">{area.tested ? `${T.area.tested} ` : ''}{area.kind === 'polygon' ? T.search.shapeNote : T.area.edgeNote}</p>
        {loading && <p className="muted">{T.loading}</p>}
        {!loading && series && series.tiles === 0 && <p className="muted">{T.noFire}</p>}
        {!loading && series && mon && series.tiles > 0 && (
          <>
            <p className="lede">{quiet
              ? T.ledeQuiet(normalYearHotspots(monCells), QUIET_MIN_HOTSPOTS_PER_YEAR, totals.nodataDays)
              : T.lede(totals.unusual, totals.critical, mon.baseline[0], mon.baseline[1], totals.nodataDays)}</p>

            <ChartCard title={T.headings.now} file={file('compare')} theme={theme} imageTitle={`${area.name}: ${mLabel.toLowerCase()}, same dates every year`}>
              <Compare meta={meta} cmp={cmp} variable={variable} theme={theme} mode={cmpMode} setMode={setCmpMode} monthShare={monthShare}
                dates={dates} setDates={setDates} />
              <WeatherContext meta={meta} cmp={cmp} area={area} />
            </ChartCard>

            <ChartCard title={T.headings.season} file={file('season')} theme={theme} imageTitle={`${area.name}: the usual fire season`}>
              <Season meta={meta} sea={sea} theme={theme} />
            </ChartCard>

            <ChartCard title={T.headings.calendar} file={file('calendar')} theme={theme} legend={calendarLegend(theme)}
              imageTitle={`${area.name}: daily ${mLabel.toLowerCase()}, ${meta.start.slice(0, 4)} to ${lastIso.slice(0, 4)}`}>
              <Calendar meta={meta} series={series} variable={variable} theme={theme} />
            </ChartCard>

            <ChartCard title={T.headings.months} file={file('months')} theme={theme} imageTitle={`${area.name}: each month against its normal (${mLabel.toLowerCase()})`}
              note={quiet ? `${T.monthGrid.quietNote} ${T.monthGrid.classMeaning}` : T.monthGrid.classMeaning}>
              <MonthGrid monthly={mon} variable={variable} theme={theme} falseAlarm={falseAlarm} recordEnd={fmtDay(dateOf(meta, lastK))} />
            </ChartCard>

            <ChartCard title={T.headings.trend} file={file('trend')} theme={theme} imageTitle={`${area.name}: monthly ${mLabel.toLowerCase()}`}
              note={T.explainShort} about={T.explainScale}>
              <Trend monthly={mon} range={range} variable={variable} theme={theme} />
            </ChartCard>

            <section className="card no-print">
              <h3>{T.headings.downloads}</h3>
              <Downloads meta={meta} area={area} series={series} mon={mon} range={range} unc={unc} variable={variable}
                dates={dates} setDates={(d) => { setDates(d); setCmpMode('custom'); }} />
            </section>
          </>
        )}
        </>}
        {footer}
      </section>
    </main>
  );
}
