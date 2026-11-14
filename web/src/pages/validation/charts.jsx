// Charts for the Validation page (14 Nov). Every value comes from a report row passed in as a prop; nothing is
// computed here except positions on the screen. Each chart has a text alternative and keeps its exact values visible.
import { useState } from 'react';

const sgn = (v) => (v == null || v === '' ? '–' : `${+v > 0 ? '+' : ''}${(+v).toFixed(1)}%`);
const p1 = (v) => (v == null || v === '' ? '–' : `${(+v).toFixed(1)}%`);

// A small segmented switch (the same look as the rest of the site)
export function Seg({ label, value, options, onChange }) {
  return (
    <div className="seg v-seg" role="group" aria-label={label}>
      {options.map(([k, l]) => <button key={k} type="button" className={value === k ? 'on' : ''} aria-pressed={value === k} onClick={() => onChange(k)}>{l}</button>)}
    </div>
  );
}

// ---------------------------------------------------------------- the 2012 step, region by region (diverging bars)
// gap = SHIFT's 2012 step against MODIS alone, in %. Zero in the middle. Bars past the axis end are drawn to the edge
// with an arrow and keep their exact value in the label.
export function RegionChart({ rows, names, flagAt = 10 }) {
  const [show, setShow] = useState('both');
  const [sel, setSel] = useState('global');
  if (!rows?.length) return <p className="muted small">Not available in this data release.</p>;
  const LIM = 35;
  const x = (v) => 50 + (Math.max(-LIM, Math.min(LIM, +v)) / LIM) * 50;   // percent of the plot width
  const bar = (v, cls) => {
    if (v == null || v === '') return null;
    const a = x(0), b = x(v), over = Math.abs(+v) > LIM;
    return <span className={`v-bar ${cls}${over ? ' over' : ''}`} style={{ left: `${Math.min(a, b)}%`, width: `${Math.abs(b - a)}%` }} />;
  };
  const r = rows.find((q) => q.region === sel) || rows[0];
  return (
    <div className="v-chart">
      <div className="v-chart-top">
        <Seg label="Bars shown" value={show} onChange={setShow} options={[['both', 'Both factor sizes'], ['final', 'Final 2.5° only']]} />
        <ul className="v-key" aria-hidden="true">
          {show === 'both' && <li><i className="v-sw coarse" />10° factors</li>}
          <li><i className="v-sw final" />final 2.5° factors</li>
          <li><i className="v-sw flag">!</i>gap above {flagAt}%</li>
        </ul>
      </div>
      <div className="v-div" role="group" aria-label="2012 step gap by region">
        <div className="v-div-axis" aria-hidden="true">
          {[-30, -20, -10, 0, 10, 20, 30].map((t) => <span key={t} style={{ left: `${x(t)}%` }}>{t > 0 ? `+${t}` : t}%</span>)}
        </div>
        {rows.map((q) => {
          const big = Math.abs(+q.fine_shrunk) > flagAt;
          return (
            <button key={q.region} type="button" className={`v-div-row${sel === q.region ? ' on' : ''}${q.region === 'global' ? ' world' : ''}`}
              aria-pressed={sel === q.region} onClick={() => setSel(q.region)}
              aria-label={`${names[q.region] || q.region}: final 2.5° factors ${sgn(q.fine_shrunk)}, 10° factors ${sgn(q.coarse)}${big ? ', above the flag line' : ''}`}>
              <span className="v-div-name">{big && <i className="v-sw flag" aria-hidden="true">!</i>}{names[q.region] || q.region}</span>
              <span className="v-div-plot">
                <span className="v-zero" style={{ left: '50%' }} />
                <span className="v-band" style={{ left: `${x(-flagAt)}%`, width: `${x(flagAt) - x(-flagAt)}%` }} />
                {show === 'both' && bar(q.coarse, 'coarse')}
                {bar(q.fine_shrunk, 'final')}
              </span>
              <span className="v-div-val"><b>{sgn(q.fine_shrunk)}</b>{show === 'both' && <span className="muted"> {sgn(q.coarse)}</span>}</span>
            </button>
          );
        })}
      </div>
      <p className="v-cap small">Zero line: SHIFT's 2012 step is the same as the step MODIS alone shows over the same years. Right of zero:
        SHIFT rises more at 2012 than MODIS alone; left: less. The shaded band is ±{flagAt}%. Axis ends at ±{LIM}%; a bar that goes
        further ends in an arrow and keeps its value in the label.</p>
      <div className="v-detail" aria-live="polite">
        <h4>{names[r.region] || r.region}</h4>
        <dl>
          <dt>Gap with the final 2.5° factors</dt><dd><b>{sgn(r.fine_shrunk)}</b></dd>
          <dt>Gap with 10° factors</dt><dd>{sgn(r.coarse)}</dd>
          <dt>Gap with 2.5° factors before shrinking</dt><dd>{sgn(r.fine)}</dd>
        </dl>
        <p className="small muted">The reference is MODIS alone (one sensor, so no switch), not ground truth. A gap near zero says the
          switch left little mark here. It does not show that the values before 2012 are right.</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- SHIFT against simpler methods (bars on a full 0 to 100 axis)
export function MethodChart({ rows, names }) {
  const [m, setM] = useState('score');
  if (!rows?.length) return <p className="muted small">Not available in this data release.</p>;
  const sorted = rows.slice().sort((a, b) => (+b[m]) - (+a[m]));
  const label = { score: 'Both measures (average)', score_cells: 'Hotspots', score_frp: 'Fire power' }[m];
  return (
    <div className="v-chart">
      <div className="v-chart-top">
        <Seg label="Score shown" value={m} onChange={setM} options={[['score', 'Combined'], ['score_cells', 'Hotspots'], ['score_frp', 'Fire power']]} />
        <span className="small muted">Higher is better. Axis 0 to 100, not cut.</span>
      </div>
      <ul className="v-hbars" aria-label={`Score by method, ${label}`}>
        {sorted.map((r) => (
          <li key={r.method} className={r.method === 'SHIFT' ? 'shift' : ''}>
            <span className="v-hb-name">{names[r.method] || r.method}</span>
            <span className="v-hb-track"><span className="v-hb-bar" style={{ width: `${Math.max(0, Math.min(100, +r[m]))}%` }} /></span>
            <span className="v-hb-val">{(+r[m]).toFixed(1)}</span>
          </li>
        ))}
      </ul>
      <p className="v-cap small">Score: the share (%) of held-out cell-months that a method puts in the same calendar class (low, normal,
        unusual or critical) as the real S-NPP month. It is a class agreement, not an accuracy of the fire numbers.</p>
    </div>
  );
}

// ---------------------------------------------------------------- filling simulated outages (grouped bars from zero)
export function FillChart({ rows, links }) {
  const [v, setV] = useState('frp');
  const data = {};
  (rows || []).filter((r) => r.variable === v).forEach((r) => { (data[r.link] ||= {})[r.method] = r.abs_error_pct; });
  const groups = Object.keys(data);
  if (!groups.length) return <p className="muted small">Not available in this data release.</p>;
  const methods = [['none', 'Counted as zero fire'], ['scale', 'Month scaled up'], ['substitute', 'Partner satellite'], ['hybrid', 'Partner, cautious']];
  const max = Math.max(40, ...groups.flatMap((g) => methods.map(([k]) => +data[g][k] || 0)));
  return (
    <div className="v-chart">
      <div className="v-chart-top">
        <Seg label="Measure" value={v} onChange={setV} options={[['frp', 'Fire power'], ['cells', 'Hotspots']]} />
        <ul className="v-key" aria-hidden="true">{methods.map(([k, l]) => <li key={k}><i className={`v-sw m-${k}`} />{l}</li>)}</ul>
      </div>
      <div className="v-groups">
        {groups.map((g) => (
          <figure key={g} className="v-group">
            <figcaption>{links[g] || g}</figcaption>
            <ul aria-label={`Error of the month's total, ${links[g] || g}`}>
              {methods.map(([k, l]) => (
                <li key={k}><span className="visually-hidden">{l}: </span>
                  <span className="v-gb-track"><span className={`v-gb-bar m-${k}`} style={{ width: `${(+data[g][k] || 0) / max * 100}%` }} /></span>
                  <span className="v-gb-val">{p1(data[g][k])}</span></li>
              ))}
            </ul>
          </figure>
        ))}
      </div>
      <p className="v-cap small">Error of the month's total, as an absolute percent (lower is better), axis from 0 to {max}%. Outages were
        simulated on days when both satellites worked, then each month rebuilt and compared with the real one.</p>
    </div>
  );
}

// ---------------------------------------------------------------- borrowed factors: two views, never one mixed axis
export function FactorChart({ rows, levels }) {
  const [view, setView] = useState('err');
  if (!rows?.length) return <p className="muted small">Not available in this data release.</p>;
  const key = view === 'err' ? 'fw_median_abs_total_error_pct' : 'tiles_within_limit_pct';
  return (
    <div className="v-chart">
      <div className="v-chart-top">
        <Seg label="View" value={view} onChange={setView} options={[['err', 'Typical error'], ['within', 'Places within ±10%']]} />
        <span className="small muted">{view === 'err' ? 'Lower is better. Axis 0 to 30%.' : 'Higher is better. Axis 0 to 100%.'}</span>
      </div>
      <ul className="v-hbars" aria-label={view === 'err' ? 'Typical error by factor source' : 'Places within ±10% by factor source'}>
        {rows.map((r) => (
          <li key={r.level}>
            <span className="v-hb-name">{levels[r.level] || r.level}<span className="small muted"> · {r.tiles} places</span></span>
            <span className="v-hb-track"><span className="v-hb-bar" style={{ width: `${(+r[key]) / (view === 'err' ? 30 : 100) * 100}%` }} /></span>
            <span className="v-hb-val">{p1(r[key])}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------- coverage: real shares on a 0 to 100 scale with the 95% line
export function CoverageBars({ items }) {
  return (
    <ul className="v-cov" aria-label="Share of 2012 to 2015 values inside the range">
      {items.map((it) => (
        <li key={it.label}>
          <span className="v-hb-name">{it.label}</span>
          <span className="v-hb-track"><span className={`v-hb-bar ${it.cls || ''}`} style={{ width: `${Math.max(0, Math.min(100, +it.value))}%` }} />
            <span className="v-target" style={{ left: '95%' }} aria-hidden="true" /></span>
          <span className="v-hb-val">{p1(it.value)}</span>
        </li>
      ))}
    </ul>
  );
}

// a schematic, labelled as one: what "inside the range" means for one cell-month
export function IntervalDiagram() {
  return (
    <figure className="v-fig">
      <svg viewBox="0 0 420 120" role="img" aria-label="Illustration: a predicted value with its range; one observed value inside the range, one outside">
        <line x1="20" x2="400" y1="92" y2="92" className="v-axisline" />
        <text x="20" y="112" className="v-axt">fewer</text><text x="400" y="112" className="v-axt" textAnchor="end">more hotspots in the cell-month</text>
        <rect x="120" y="44" width="170" height="16" rx="8" className="v-range" />
        <line x1="200" x2="200" y1="36" y2="68" className="v-pred" />
        <text x="196" y="26" className="v-lab" textAnchor="end">predicted from MODIS</text>
        <text x="205" y="84" className="v-axt" textAnchor="middle">calibrated range</text>
        <circle cx="250" cy="52" r="6" className="v-obs in" />
        <circle cx="335" cy="52" r="6" className="v-obs out" />
        <text x="250" y="36" className="v-lab" textAnchor="middle">inside</text>
        <text x="335" y="36" className="v-lab" textAnchor="middle">outside</text>
      </svg>
      <figcaption className="v-cap small">Illustration, not real values. Dots: the real S-NPP value for two cell-months. Coverage counts
        how often the real value falls inside the range.</figcaption>
    </figure>
  );
}

// NOAA-20 ÷ S-NPP by year: a line per measure, a reference line at 1 (axis 0.90 to 1.10, labelled)
export function RatioChart({ series }) {
  const years = Object.keys(series[0]?.by_year || {});
  if (!years.length) return null;
  const W = 420, H = 150, l = 40, r = 12, t = 12, b = 26;
  const x = (i) => l + (i / Math.max(1, years.length - 1)) * (W - l - r);
  const y = (v) => t + (1 - (v - 0.9) / 0.2) * (H - t - b);
  return (
    <figure className="v-fig">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={series.map((s) => `${s.label}: ${years.map((yr) => `${yr} ${(+s.by_year[yr]).toFixed(2)}`).join(', ')}`).join('. ')}>
        {[0.9, 0.95, 1, 1.05, 1.1].map((v) => <g key={v}><line x1={l} x2={W - r} y1={y(v)} y2={y(v)} className={v === 1 ? 'v-one' : 'v-grid'} />
          <text x={l - 6} y={y(v) + 3} className="v-axt" textAnchor="end">{v.toFixed(2)}</text></g>)}
        {years.map((yr, i) => (i % 2 === 0 || i === years.length - 1) && <text key={yr} x={x(i)} y={H - 8} className="v-axt" textAnchor="middle">{yr}</text>)}
        {series.map((s) => <g key={s.label} className={`v-line ${s.cls}`}>
          <polyline fill="none" points={years.map((yr, i) => `${x(i)},${y(+s.by_year[yr])}`).join(' ')} />
          {years.map((yr, i) => <circle key={yr} cx={x(i)} cy={y(+s.by_year[yr])} r="2.6" />)}</g>)}
      </svg>
      <figcaption className="v-cap small">NOAA-20 ÷ S-NPP each year; 1.00 means both see the same. Axis 0.90 to 1.10 so the small
        differences show; exact values are in the complete results.</figcaption>
    </figure>
  );
}
