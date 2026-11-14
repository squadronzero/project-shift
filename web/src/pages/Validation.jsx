// Validation: the pipeline's own test results, read from the reports that ship with the data.
// Every number here is copied from a report file; nothing is recomputed in the browser.
// Redesigned 14 Nov: an overview with six evidence cards (each with its qualifier on the card), charts for the 2012 step by
// region, the simpler methods, outage filling and borrowed factors, an uncertainty explainer, limitation cards, and every
// original table kept under "View complete validation results".
import { useEffect, useMemo, useState } from 'react';
import { csv, json } from '../lib/data.js';
import { CoverageBars, FactorChart, FillChart, IntervalDiagram, MethodChart, RatioChart, RegionChart } from './validation/charts.jsx';

export const REGION_NAMES = { global: 'Whole world', bangladesh: 'Area around Bangladesh', africa_savanna: 'Central African savanna',
  australia_savanna: 'Northern Australia', amazon_arc: 'Amazon deforestation arc', siberia_boreal: 'Siberian boreal forest',
  iberia_med: 'Iberian Peninsula', punjab_crop: 'Punjab crop burning', kalimantan_peat: 'Kalimantan peatlands', java_volcanic: 'Java',
  florida: 'Florida' };

const get = (o, ...path) => path.reduce((a, k) => (a == null ? a : a[k]), o);
const one = (v) => (v == null ? '' : `${(+v).toFixed(1)}%`);
const pct = (v) => (v == null ? '' : `${v > 0 ? '+' : ''}${(+v).toFixed(1)}%`);
const yes = (v) => (v == null ? '' : v ? 'PASS' : 'FAIL');
const LINKS = { 'S-NPP <- NOAA-20': 'VIIRS S-NPP ← NOAA-20', 'S-NPP <- D19': 'VIIRS S-NPP ← MODIS', 'MODIS <- Aqua': 'MODIS ← Aqua alone', 'MODIS <- Terra': 'MODIS ← Terra alone' };
const LEVELS = { 'own month': 'Its own data, that month', 'own all-year': 'Its own data, whole year', 'zone (without the tile)': 'Its 30° neighbourhood', 'world (without the tile)': 'The whole world' };
const EVENTS = { russia_2010: 'Russia 2010 heatwave fires', greece_2007: 'Greece 2007', indonesia_2006: 'Indonesia 2006 peat fires',
  indonesia_2015: 'Indonesia 2015 peat fires', amazon_2019: 'Amazon 2019', australia_2019_20: 'Australia Black Summer 2019-20',
  pantanal_2020: 'Pantanal 2020', canada_2023: 'Canada 2023' };
const METHODS = { 'no harmonisation': 'Nothing (join the records)', 'one global ratio': 'One ratio for the world',
  'one ratio per 10-degree region, all months': 'One ratio per 10° region', 'v1 Florida line': 'Our v1 Florida line', SHIFT: 'SHIFT' };
const REPO = 'https://github.com/squadronzero/project-shift';
const SECTIONS = [['v-overview', 'Overview'], ['v-transition', 'The 2012 step'], ['v-methods', 'Simpler methods'], ['v-uncertainty', 'Uncertainty'],
  ['v-tests', 'More tests'], ['v-limits', 'Limits'], ['v-evidence', 'Complete results']];

function Table({ rows, cols, labels, fmt = {}, caption }) {
  if (!rows?.length) return <p className="muted small">Not available in this data release.</p>;
  return (
    <div className="tablewrap" tabIndex={0} role="region" aria-label={caption || 'Table'}><table>
      {caption && <caption className="visually-hidden">{caption}</caption>}
      <thead><tr>{cols.map((c) => <th key={c} scope="col">{labels?.[c] || c}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{cols.map((c) => <td key={c}>{fmt[c] ? fmt[c](r[c], r) : r[c] ?? ''}</td>)}</tr>)}</tbody>
    </table></div>
  );
}

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
function jump(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
  const h = el.querySelector('h3, h2');
  if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
}

// one evidence card: title, the number, its unit, a small indicator, a short reading, the qualifier (always visible) and a link
function Card({ title, value, unit, indicator, reading, strength, qualifier, to }) {
  return (
    <article className="v-card">
      <p className="v-card-title">{title}</p>
      <p className="v-card-value"><b>{value}</b> <span>{unit}</span></p>
      {indicator}
      <p className="v-card-reading">{reading}</p>
      <p className="v-card-strength"><span className="v-tag">{strength}</span></p>
      <p className="v-card-qual">{qualifier}</p>
      <button type="button" className="linkbtn v-card-go" onClick={() => jump(to)}>Explore the evidence ↓</button>
    </article>
  );
}

// small, honest indicators (no gauges): a value on a labelled scale
const GateIndicator = ({ v, gate }) => {
  const x = (q) => 50 + (Math.max(-2 * gate, Math.min(2 * gate, q)) / (2 * gate)) * 50;
  return (
    <div className="v-ind" aria-hidden="true">
      <span className="v-ind-band" style={{ left: `${x(-gate)}%`, width: `${x(gate) - x(-gate)}%` }} />
      <span className="v-ind-zero" style={{ left: '50%' }} />
      <span className="v-ind-dot" style={{ left: `${x(v)}%` }} />
      <span className="v-ind-l">−{2 * gate}%</span><span className="v-ind-m">gate ±{gate}%</span><span className="v-ind-r">+{2 * gate}%</span>
    </div>
  );
};
const ScaleIndicator = ({ v, ref2, ref2Label, max = 100 }) => (
  <div className="v-ind" aria-hidden="true">
    <span className="v-ind-fill" style={{ width: `${(v / max) * 100}%` }} />
    {ref2 != null && <span className="v-ind-ref" style={{ left: `${(ref2 / max) * 100}%` }} title={ref2Label} />}
    <span className="v-ind-l">0</span>{ref2Label && <span className="v-ind-m">{ref2Label}</span>}<span className="v-ind-r">{max}</span>
  </div>
);
const DotsIndicator = ({ hit, n }) => (
  <div className="v-dots" aria-hidden="true">{Array.from({ length: n }, (_, i) => <i key={i} className={i < hit ? 'on' : ''} />)}</div>
);

export default function Validation() {
  const [d, setD] = useState({});
  const [open, setOpen] = useState(false);       // "View complete validation results"
  const [active, setActive] = useState(SECTIONS[0][0]);
  useEffect(() => {
    const load = (k, p, f) => f(`validation/${p}`).then((v) => setD((o) => ({ ...o, [k]: v }))).catch(() => {});
    load('harm', 'report_harmonise.json', json);
    load('checks', 'report_checks.json', json);
    load('res', 'counts__resolution_region_steps.csv', csv);
    load('fill', 'nodata__fill_test_scores.csv', csv);
    load('borrow', 'places__borrowed_factor_test.csv', csv);
    load('simple', 'checks__simple_methods.csv', csv);
  }, []);
  // the section in view is marked in the section bar: the last one whose top has passed just under the bar
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        let cur = SECTIONS[0][0];
        for (const [id] of SECTIONS) { const el = document.getElementById(id); if (el && el.getBoundingClientRect().top <= 120) cur = id; }
        setActive(cur);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, [d.checks]);

  const g = get(d.harm, 'gate_2012_step', 'global');
  const gate = get(d.harm, 'gate_2012_step', 'tolerance_pct') ?? 5;
  const ck = d.checks || {};
  const anom = get(ck, 'anomaly_rule', 'regions') || get(ck, 'anomaly_rule') || get(d.harm, 'anomaly_rule');
  const fillRows = useMemo(() => {
    const out = {};
    (d.fill || []).filter((r) => r.variable === 'frp').forEach((r) => { (out[r.link] ||= { link: r.link })[r.method] = r.abs_error_pct; });
    return Object.values(out);
  }, [d.fill]);
  const test26 = Object.entries(get(ck, 'final_test_2026', 'predictors') || {}).map(([name, v]) => ({
    name, cells: get(v, 'cells', 'global_error_pct'), frp: get(v, 'frp', 'global_error_pct'), pass: v.pass }));
  const simple = (d.simple?.length ? d.simple : ck.simple_methods) || [];
  const shiftRow = simple.find((r) => r.method === 'SHIFT');
  const bestSimple = simple.length ? Math.max(...simple.filter((r) => r.method !== 'SHIFT').map((r) => +r.score || 0)) : null;
  const events = get(ck, 'known_events', 'table') || [];
  const evSum = get(ck, 'known_events', 'summary', 'SHIFT frp');
  const evHits = events.filter((e) => e['SHIFT frp hit']).length;
  const cover = get(ck, 'coverage', 'cells') || [];
  const covAreas = get(ck, 'coverage', 'areas');
  const calYears = get(ck, 'coverage', 'calibrate_years');
  const verYears = get(ck, 'coverage', 'verify_years');
  const ba = ck.burned_area;
  const cloud = ck.cloud;
  const crit = get(ck, 'critical_periods', 'critical_days_by_era') || {};
  const ratios = Object.entries(get(ck, 'satellite_ratios') || {}).filter(([k]) => k.startsWith('NOAA-20 per'));
  const coverOf = (v) => cover.find((r) => r.variable === v)?.calibrated_coverage_pct;
  const bandOf = (v) => cover.find((r) => r.variable === v)?.factor_band_coverage_pct;
  const weakRegions = (d.res || []).filter((r) => r.region !== 'global' && Math.abs(+r.fine_shrunk) >= 5)
    .sort((a, b) => Math.abs(+b.fine_shrunk) - Math.abs(+a.fine_shrunk));
  const caught = get(anom, 'plain', 'caught_pct');

  return (
    <main className="page validation">
      {/* ------------------------------------------------ overview */}
      <section id="v-overview" className="v-sec v-hero" aria-labelledby="v-h-overview">
        <h2 id="v-h-overview">Testing the science behind S.H.I.F.T</h2>
        <p className="lede">What was tested, what the results show, and where the tests stop. A harmonised record is only useful if the
          sensor of origin no longer matters. Each test's rule was written into the settings before its run, and every number on this
          page is copied straight from the pipeline's reports. The tests do not all have the same independence: some years serve more
          than one step, and each result says where. There is no VIIRS before 2012, so no test can check the MODIS-era values directly.
          The tests use the years when both sensors flew.</p>
        <ul className="v-cats" aria-label="What was tested">
          {[['v-transition', 'Sensor continuity', 'Does the 2012 switch leave a step?'], ['v-methods', 'Simpler methods', 'Is the method worth it?'],
            ['v-uncertainty', 'Uncertainty', 'What do the ranges cover?'], ['v-tests', 'Historical and satellite tests', 'Events, 2026, outages'],
            ['v-limits', 'External checks and limits', 'What the tests cannot show']].map(([id, t, s]) => (
            <li key={id}><button type="button" onClick={() => jump(id)}><b>{t}</b><span>{s}</span></button></li>
          ))}
        </ul>
        <div className="v-cards">
          {g && <Card title="2012 step, hotspots" value={pct(g.cells_gap_pct)} unit="gap, whole world"
            indicator={<GateIndicator v={+g.cells_gap_pct} gate={gate} />}
            reading={`SHIFT's 2012 step against the step MODIS alone shows over the same years (one sensor, so no switch). Gate: within ±${gate}%.`}
            strength="Pre-set gate · continuity only"
            qualifier="The factors were fitted on 2012 to 2019, which includes the 2013 to 2015 side of this comparison, so this shows continuity at the switch, not that the factors are right before 2012."
            to="v-transition" />}
          {g && <Card title="2012 step, fire power" value={pct(g.frp_gap_pct)} unit="gap, whole world"
            indicator={<GateIndicator v={+g.frp_gap_pct} gate={gate} />}
            reading="The same comparison for fire power."
            strength="Pre-set gate · continuity only"
            qualifier="Same limits as the hotspot gap. Regions differ: some keep a larger step (see the regional chart)."
            to="v-transition" />}
          {shiftRow && <Card title="Against simpler methods" value={(+shiftRow.score).toFixed(1)} unit={`score out of 100 · best simple method ${bestSimple?.toFixed(1)}`}
            indicator={<ScaleIndicator v={+shiftRow.score} ref2={bestSimple} ref2Label={`best simple ${bestSimple?.toFixed(1)}`} />}
            reading="The share of held-out cell-months put in the same calendar class as the real S-NPP month. Higher is better."
            strength="Not fully independent"
            qualifier="SHIFT's own settings were chosen on held-out tests of this kind, so its lead may be a little optimistic."
            to="v-methods" />}
          {evSum && <Card title="Known fire disasters" value={`${evHits} of ${events.length}`} unit="events flagged unusual or critical"
            indicator={<DotsIndicator hit={evHits} n={events.length} />}
            reading={`Months of well-known fire events that SHIFT's fire power marks as unusual or critical (chance: ${evSum.base_rate_pct}%).`}
            strength={`Small test · ${events.length} events`}
            qualifier="MODIS alone and the raw joined record flag them about as often. This is not proof that SHIFT detects disasters."
            to="v-tests" />}
          {cover.length > 0 && <Card title="Calibrated range coverage" value={one(coverOf('cells'))} unit={`of tested cell-months inside the range (hotspots; fire power ${one(coverOf('frp'))})`}
            indicator={<ScaleIndicator v={+coverOf('cells')} ref2={95} ref2Label="95% aim" />}
            reading={`Checked on ${verYears ? `${verYears[0]} to ${verYears[1]}` : '2012 to 2015'}, years left out of the fit that made the predictions.`}
            strength="Not fully independent"
            qualifier="It does not show that the published pre-2012 ranges hold the true value 95% of the time. Read the full note in Uncertainty."
            to="v-uncertainty" />}
          {caught != null && <Card title="Unusual months, MODIS against S-NPP" value={`${caught}%`} unit="of S-NPP's unusual months also marked"
            indicator={<ScaleIndicator v={+caught} />}
            reading={`In the test regions, each year 2012 to 2019 predicted with that year left out. False alarms ${get(anom, 'plain', 'false_alarm_pct')}%.`}
            strength="Leave one year out · test regions"
            qualifier={`For single 2.5° cells it is lower: ${get(ck, 'anomaly_rule', 'plain', 'caught_pct')}% caught, ${get(ck, 'anomaly_rule', 'plain', 'false_alarm_pct')}% false alarms.`}
            to="v-limits" />}
        </div>
      </section>

      {/* section bar: one row of links, sticky, wraps on small screens */}
      <nav className="v-nav" aria-label="Validation sections">
        {SECTIONS.map(([id, l]) => <button key={id} type="button" className={active === id ? 'on' : ''} aria-current={active === id ? 'true' : undefined}
          onClick={() => { if (id === 'v-evidence' && !open) { setOpen(true); requestAnimationFrame(() => requestAnimationFrame(() => jump(id))); } else jump(id); }}>{l}</button>)}
      </nav>

      {/* ------------------------------------------------ the 2012 step by region */}
      <section id="v-transition" className="v-sec" aria-labelledby="v-h-tr">
        <h3 id="v-h-tr">The 2012 step, region by region</h3>
        <p className="small">The 2012 step (average of 2013 to 2015 against 2009 to 2011), SHIFT compared with MODIS alone. A gap near zero
          means the switch left no mark. Iberia is flagged: its gap is above 10%. Joined raw, hotspots jump {g?.cells_step_raw_switch ?? '–'} times at 2012.
          Choose a region for its exact values.</p>
        <RegionChart rows={d.res} names={REGION_NAMES} />
      </section>

      {/* ------------------------------------------------ simpler methods */}
      <section id="v-methods" className="v-sec" aria-labelledby="v-h-me">
        <h3 id="v-h-me">SHIFT against simpler methods</h3>
        <p className="small">Each method predicts S-NPP months from MODIS in years when both flew and that the fit did not use (leave one
          year out, and a backward test that fits on later years and predicts 2012 to 2015). Score out of 100.</p>
        <MethodChart rows={simple} names={METHODS} />
        <p className="v-note">SHIFT's resolution and settings were chosen on tests of this kind, so this comparison is not fully independent
          of that choice. SHIFT also has the lowest typical cell error ({shiftRow ? `${shiftRow.fw_median_abs_backward_error_pct_cells}% hotspots, ${shiftRow.fw_median_abs_backward_error_pct_frp}% fire power` : '–'}),
          but its whole-world total error ({shiftRow ? `${pct(shiftRow.global_backward_error_pct_cells)} hotspots, ${pct(shiftRow.global_backward_error_pct_frp)} fire power` : '–'}) is
          larger than that of a single world ratio, which is fitted to make exactly that total right.</p>
      </section>

      {/* ------------------------------------------------ uncertainty */}
      <section id="v-uncertainty" className="v-sec" aria-labelledby="v-h-un">
        <h3 id="v-h-un">Uncertainty: what the ranges cover</h3>
        <div className="v-two">
          <div>
            <p className="small">Before 2012 every value carries a range for the MODIS-to-VIIRS conversion. The check below asks how often the
              real S-NPP value of a cell-month falls inside a range built the same way from MODIS. It measures coverage of the conversion
              error only. It is not an accuracy score for the fire numbers.</p>
            <IntervalDiagram />
          </div>
          <div>
            {cover.length > 0 && <CoverageBars items={[
              { label: 'Hotspots, calibrated range', value: coverOf('cells'), cls: 'final' },
              { label: 'Fire power, calibrated range', value: coverOf('frp'), cls: 'final' },
              { label: 'Hotspots, factor spread alone', value: bandOf('cells') },
              { label: 'Fire power, factor spread alone', value: bandOf('frp') },
            ]} />}
            <p className="v-cap small">Line at 95%. "Factor spread alone" is the range from the spread of the fitted factor before it is
              widened; the calibrated range is widened using {calYears ? `${calYears[0]} to ${calYears[1]}` : 'later years'} and checked on
              {' '}{verYears ? `${verYears[0]} to ${verYears[1]}` : '2012 to 2015'}.{covAreas ? ` For whole regions: ${one(get(covAreas, 'cells', 'independent_coverage_pct'))} hotspots, ${one(get(covAreas, 'frp', 'independent_coverage_pct'))} fire power.` : ''}</p>
          </div>
        </div>
        {cover.length > 0 && <p className="coverage"><b>{one(coverOf('cells'))}</b><span>of 2012 to 2015 cell-months fall inside the calibrated
          95% range (hotspots; fire power {one(coverOf('frp'))}){ck.tested_cells ? `, on the ${(+ck.tested_cells).toLocaleString('en-GB')} tested 2.5° cells` : ''}.
          <em className="qualifier"> Not a fully independent check. The 2012 to 2015 years were left out of the fit that made these
          predictions, but they were also used to choose and weight the tested cells, in the fits that set the range widths and sorted
          the cells into groups, and in choosing the model. The ranges checked here are also built a little differently from the
          published pre-2012 ranges, which have not been checked themselves. Coverage on truly unseen data could be higher or lower,
          and it has not been measured.</em></span></p>}
        <details className="v-more">
          <summary>What the ranges leave out</summary>
          <ul>
            <li>Fire hidden by cloud or smoke, and false detections.</li>
            <li>Any change in the VIIRS to MODIS ratio before 2012, which cannot be measured.</li>
            <li>The larger errors of single days and small areas.</li>
            <li>So the ranges are a guide to the conversion error, not a guaranteed 95% bound on the true value.</li>
          </ul>
        </details>
      </section>

      {/* ------------------------------------------------ more tests */}
      <section id="v-tests" className="v-sec" aria-labelledby="v-h-te">
        <h3 id="v-h-te">More tests</h3>

        <h4>Known fire disasters</h4>
        <p className="small">Months of well-known fire events, and whether SHIFT's fire power marks them as unusual or critical (z of 1 or
          more). {evSum ? `Hit rate ${evSum.hit_rate_pct}% against a chance rate of ${evSum.base_rate_pct}%.` : ''} MODIS alone and the raw joined
          record flag them about as often, so this shows the classes work on known events, not that SHIFT detects or predicts disasters.</p>
        <ul className="v-events">
          {events.map((e) => (
            <li key={e.event} className={e['SHIFT frp hit'] ? 'hit' : 'miss'}>
              <b>{EVENTS[e.event] || String(e.event).replace(/_/g, ' ')}</b>
              <span className="small muted">{e.months}</span>
              <span className="v-ev-z">Highest z <b>{e['SHIFT frp max z'] == null ? '–' : (+e['SHIFT frp max z']).toFixed(1)}</b></span>
              <span className="v-ev-flag">{e['SHIFT frp hit'] ? '✓ Flagged' : '✕ Not flagged'}</span>
              <span className="small muted">MODIS alone: {e['MODIS alone frp hit'] ? 'flagged' : 'not flagged'} · raw joined: {e['raw stitched frp hit'] ? 'flagged' : 'not flagged'}</span>
            </li>
          ))}
        </ul>

        <h4>The untouched 2026 test</h4>
        <p className="small">2026 data was locked away until the model was final, then predicted once. The result is stored and never rerun.
          Aqua fails on fire power because its orbit has drifted since 2022; no value in the record comes from Aqua alone after Feb 2023.
          This tests the satellite links used from 2020 on. It does not test the MODIS factors used before 2012.</p>
        <ul className="v-pass">
          {test26.map((r) => (
            <li key={r.name} className={r.pass ? 'pass' : 'fail'}>
              <b>{r.name}</b>
              <span>Hotspots error {pct(r.cells)}</span><span>Fire power error {pct(r.frp)}</span>
              <span className="v-pf">{r.pass ? '✓ PASS' : '✕ FAIL'}</span>
            </li>
          ))}
        </ul>

        {ratios.length > 0 && <>
          <h4>NOAA-20 carries the record on</h4>
          <p className="small">NASA FIRMS stopped producing new Suomi NPP data at 13:00 UTC on 2 November 2026. NOAA-20 sees the same fire as
            Suomi NPP every year (ratio near 1), so it can take over.</p>
          <RatioChart series={ratios.map(([k, v]) => ({ label: k.replace(' per ', ' ÷ '), by_year: v.by_year || {}, cls: k.includes('frp') ? 'frp' : 'cells' }))} />
          <ul className="v-key" aria-hidden="true"><li><i className="v-sw final" />hotspots</li><li><i className="v-sw coarse" />fire power</li></ul>
        </>}

        <h4>Filling satellite outages</h4>
        <p className="small">Real outages were simulated on days when both satellites worked, and each month rebuilt. This measures the method
          on simulated gaps; a real outage can differ, so the partner methods do not always reach these errors.</p>
        <FillChart rows={d.fill} links={LINKS} />

        <h4>How good is a borrowed factor?</h4>
        <p className="small">Places with little fire borrow their factor from a wider area. Each tested place was rebuilt without its own data
          to measure that honestly. Local data does best where there is enough fire; a borrowed factor is a fallback, and places that
          need one deserve more caution.</p>
        <FactorChart rows={d.borrow} levels={LEVELS} />
      </section>

      {/* ------------------------------------------------ limits and external checks */}
      <section id="v-limits" className="v-sec" aria-labelledby="v-h-li">
        <h3 id="v-h-li">External checks and limits</h3>
        <div className="v-lims">
          <article className="v-lim support">
            <p className="v-tag">Consistency check</p>
            <h4>Against burned area (GFED4)</h4>
            <p>{ba ? `The 2012 step in SHIFT agrees with the burned-area record for the whole world: ${yes(ba.global_pass)}. Regions passing for both measures: ${ba.regions_passing_both ?? '–'} (the failures also fail for MODIS alone).` : 'Not available in this data release.'}</p>
            <p className="small"><b>Cannot show:</b> GFED4 is itself built from MODIS data, so this is a consistency check, not independent ground truth.</p>
          </article>
          <article className="v-lim limit">
            <p className="v-tag">Observation limit</p>
            <h4>Cloud</h4>
            <p>{cloud ? `Low-fire months are cloudy ${cloud.cloudy_share_low_months_pct}% of the time against ${cloud.cloudy_share_all_months_pct}% overall, so cloudy months carry a flag in the monthly view (${cloud.flag_shown ? 'shown' : 'not shown'}).` : 'Not available in this data release.'}</p>
            <p className="small"><b>Cannot show:</b> how much fire the cloud hid. A low month can be cloud, not less fire.</p>
          </article>
          {crit && Object.keys(crit).length > 0 && <article className="v-lim limit">
            <p className="v-tag">Interpretation limit</p>
            <h4>Days before 2012 are indicative</h4>
            <p>Critical days are more frequent in the MODIS years than the same rule shows from 2012 (SHIFT: {crit.SHIFT ? `${(+crit.SHIFT.median_before).toFixed(1)} a year before, ${(+crit.SHIFT.median_from_2012).toFixed(1)} from 2012` : '–'}), so dated critical
              periods and daily or weekly views before 20 January 2012 are labelled indicative. Months are tested.</p>
            <p className="small"><b>Cannot show:</b> that a single pre-2012 day or week is right. Months and larger areas are the dependable reading.</p>
          </article>}
          <article className="v-lim limit">
            <p className="v-tag">Regional limit</p>
            <h4>Some regions keep a step</h4>
            <p>{weakRegions.length ? `Gaps of 5% or more with the final factors: ${weakRegions.map((r) => `${REGION_NAMES[r.region] || r.region} ${pct(r.fine_shrunk)}`).join(', ')}.` : 'Not available in this data release.'}</p>
            <p className="small"><b>Cannot show:</b> that the switch left no mark everywhere. The ±5% gate is for the whole world.</p>
          </article>
          <article className="v-lim limit">
            <p className="v-tag">Interpretation limit</p>
            <h4>Unusual and critical are statistics</h4>
            <p>{caught != null ? `In the test regions ${caught}% of S-NPP's unusual months are also marked from MODIS, with ${get(anom, 'plain', 'false_alarm_pct')}% false alarms.` : ''} About one in four unusual months in the MODIS years would not be unusual to VIIRS; those months are marked.</p>
            <p className="small"><b>Cannot show:</b> fire danger or emergencies. The classes compare a month with that place's own normal.</p>
          </article>
          <article className="v-lim support">
            <p className="v-tag">Scope</p>
            <h4>What the 2026 test covers</h4>
            <p>It tests the satellite links used from 2020 on.{test26.length ? ` Pass: ${test26.filter((r) => r.pass).map((r) => r.name).join(', ') || 'none'}. Fail: ${test26.filter((r) => !r.pass).map((r) => r.name).join(', ') || 'none'}.` : ''}</p>
            <p className="small"><b>Cannot show:</b> anything about the MODIS-to-VIIRS factors used before 2012.</p>
          </article>
        </div>
      </section>

      {/* ------------------------------------------------ every original table */}
      <section id="v-evidence" className="v-sec" aria-labelledby="v-h-ev">
        <h3 id="v-h-ev">Complete validation results</h3>
        <p className="small">Every table from the reports, with exact values. Nothing here depends on the charts above.</p>
        <details className="v-all" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
          <summary>{open ? 'Hide the complete validation results' : 'View complete validation results'}</summary>

          <h4>The 2012 step, region by region</h4>
          <Table rows={d.res} cols={['region', 'coarse', 'fine_shrunk']} caption="The 2012 step by region"
            labels={{ region: 'Region', coarse: 'Gap, 10° factors', fine_shrunk: 'Gap, final 2.5° factors' }}
            fmt={{ region: (v) => REGION_NAMES[v] || v, coarse: pct, fine_shrunk: pct }} />

          <h4>SHIFT against simpler methods</h4>
          <Table rows={simple} cols={['method', 'score_cells', 'score_frp', 'score']} caption="Scores of the simpler methods"
            labels={{ method: 'Method', score_cells: 'Hotspots', score_frp: 'Fire power', score: 'Score' }}
            fmt={{ method: (v) => METHODS[v] || v }} />

          <h4>The untouched 2026 test</h4>
          <Table rows={test26} cols={['name', 'cells', 'frp', 'pass']} caption="The 2026 test"
            labels={{ name: 'Satellite used to predict S-NPP', cells: 'Hotspots error', frp: 'Fire power error', pass: 'Result' }}
            fmt={{ cells: pct, frp: pct, pass: yes }} />

          <h4>Known fire disasters</h4>
          <Table rows={events} cols={['event', 'months', 'SHIFT frp max z', 'SHIFT frp hit']} caption="Known fire disasters"
            labels={{ event: 'Event', months: 'Months', 'SHIFT frp max z': 'Highest z', 'SHIFT frp hit': 'Flagged' }}
            fmt={{ event: (v) => EVENTS[v] || String(v).replace(/_/g, ' '), 'SHIFT frp hit': (v) => (v ? 'yes' : 'no'), 'SHIFT frp max z': (v) => (v == null ? '' : (+v).toFixed(1)) }} />

          {crit && Object.keys(crit).length > 0 && <>
            <h4>Critical days a year, before and from 2012</h4>
            <Table rows={Object.entries(crit).map(([k, v]) => ({ k, ...v }))} cols={['k', 'median_before', 'median_from_2012']} caption="Critical days by era"
              labels={{ k: 'Series', median_before: 'Critical days a year before 2012', median_from_2012: 'From 2012' }}
              fmt={{ median_before: (v) => (v == null ? '' : (+v).toFixed(1)), median_from_2012: (v) => (v == null ? '' : (+v).toFixed(1)) }} />
          </>}

          {ratios.length > 0 && <>
            <h4>NOAA-20 against Suomi NPP, by year</h4>
            <Table rows={ratios.map(([k, v]) => ({ k: k.replace(' per ', ' ÷ '), ...Object.fromEntries(Object.entries(v.by_year || {}).map(([y, x]) => [y, x == null ? '' : (+x).toFixed(2)])) }))}
              cols={['k', ...Object.keys(ratios[0][1].by_year || {})]} labels={{ k: 'Ratio' }} caption="NOAA-20 ÷ S-NPP by year" />
          </>}

          <h4>Filling satellite outages (fire power)</h4>
          <Table rows={fillRows} cols={['link', 'none', 'scale', 'substitute', 'hybrid']} caption="Outage filling, fire power"
            labels={{ link: 'Gap in ← filled from', none: 'Counted as zero fire', scale: 'Month scaled up', substitute: 'Partner satellite', hybrid: 'Partner, cautious' }}
            fmt={{ link: (v) => LINKS[v] || v, none: one, scale: one, substitute: one, hybrid: one }} />

          <h4>How good is a borrowed factor?</h4>
          <Table rows={d.borrow} cols={['level', 'tiles', 'fw_median_abs_total_error_pct', 'tiles_within_limit_pct']} caption="Borrowed factors"
            labels={{ level: 'Factor from', tiles: 'Places tested', fw_median_abs_total_error_pct: 'Typical error', tiles_within_limit_pct: 'Places within ±10%' }}
            fmt={{ level: (v) => LEVELS[v] || v, fw_median_abs_total_error_pct: one, tiles_within_limit_pct: one }} />

          <h4>The reports</h4>
          <ul className="v-files">
            {['report_checks.json', 'report_harmonise.json', 'report_nodata.json', 'report_resolution.json', 'checks__simple_methods.csv',
              'counts__resolution_region_steps.csv', 'nodata__fill_test_scores.csv', 'places__borrowed_factor_test.csv'].map((f) => (
              <li key={f}><a href={`data/validation/${f}`}><code>{f}</code></a></li>
            ))}
            <li><a href={`${REPO}/blob/main/docs/audit/VALIDATION_REPORT.md`}>Validation report</a> · <a href={`${REPO}/blob/main/docs/audit/SCIENTIFIC_LIMITATIONS.md`}>Scientific limitations</a>
              {' '}· <a href={`${REPO}/blob/main/docs/audit/SCIENTIFIC_CLAIMS_CORRECTION_2026-11-11.md`}>Claims correction (11 Nov)</a></li>
          </ul>
        </details>
        <p className="small">Every pipeline stage writes a full report; they ship with this site's data (folder <code>data/validation</code>) and are described in the
          {' '}<a href={REPO}>code repository</a>.</p>
      </section>
    </main>
  );
}
