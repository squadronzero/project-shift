// Small schematic drawings for the Method page. They are illustrations: no value in them is a measurement,
// and each one says so in its caption.
import { useState } from 'react';

const Cap = ({ children }) => <figcaption className="m-cap">{children}</figcaption>;

// Step 1: which satellite feeds the record when (years only, from the content file).
export function CollectDiagram() {
  const x = (y) => 20 + ((y - 2000) / 27) * 520;
  // [label, [start, end, kind]...]: MODIS is the source before 2012, then only fills gaps until Aqua's limit (Feb 2023)
  const rows = [['MODIS (Terra, Aqua)', [2002, 2012.05, 'src'], [2012.05, 2023.08, 'fill']],
    ['VIIRS Suomi NPP', [2012.05, 2026.8, 'ref']], ['VIIRS NOAA-20', [2018, 2026.8, 'fill']]];
  return (
    <figure className="m-fig">
      <svg viewBox="0 0 560 120" role="img" aria-label="MODIS is the source from 2002 to 2011 and fills gaps until early 2023, VIIRS Suomi NPP is the record from 2012, VIIRS NOAA-20 fills gaps from 2018">
        {[2000, 2005, 2010, 2015, 2020, 2025].map((y) => <g key={y}><line x1={x(y)} x2={x(y)} y1="8" y2="96" className="m-gridline" />
          <text x={x(y)} y="112" className="m-axis" textAnchor="middle">{y}</text></g>)}
        {rows.map(([n, ...segs], i) => <g key={n}>
          {segs.map(([a, b, k]) => <rect key={a} x={x(a)} y={14 + i * 26} width={x(b) - x(a)} height="14" rx="3" className={`m-bar ${k}`} />)}
          <text x={x(segs[0][0]) + 6} y={25 + i * 26} className="m-barlabel">{n}</text></g>)}
        <line x1={x(2012.05)} x2={x(2012.05)} y1="6" y2="96" className="m-switch" />
      </svg>
      <Cap>Illustration of the years each sensor feeds the record. Coloured bars make the record, grey bars only fill gaps. Dashed line: 20 January 2012, when VIIRS takes over.</Cap>
    </figure>
  );
}

// Step 2: one fire seen by each sensor; several detections, one hotspot either way.
export function HotspotDiagram() {
  const [sensor, setSensor] = useState('viirs');
  const dets = sensor === 'viirs'
    ? [[40, 46], [58, 52], [74, 44], [52, 70], [70, 66], [88, 60], [62, 86]]
    : [[52, 52], [80, 74]];
  const px = sensor === 'viirs' ? 14 : 34;
  return (
    <figure className="m-fig">
      <div className="seg m-toggle" role="group" aria-label="Sensor">
        {[['viirs', 'VIIRS, 375 m pixels'], ['modis', 'MODIS, 1 km pixels']].map(([k, l]) =>
          <button key={k} type="button" className={sensor === k ? 'on' : ''} aria-pressed={sensor === k} onClick={() => setSensor(k)}>{l}</button>)}
      </div>
      <svg viewBox="0 0 300 140" role="img" aria-label={`${dets.length} detections inside one 0.05 degree cell: one hotspot`}>
        <rect x="20" y="20" width="110" height="110" className="m-cell" />
        <text x="75" y="14" className="m-axis" textAnchor="middle">one 0.05° cell, one day</text>
        {dets.map(([a, b], i) => <rect key={i} x={a - px / 2} y={b - px / 2} width={px} height={px} className="m-det" />)}
        <text x="150" y="58" className="m-big">{dets.length} detections</text>
        <text x="150" y="86" className="m-big accent">= 1 hotspot</text>
      </svg>
      <Cap>Illustration, not real data. Counting cells instead of detections keeps the finer sensor from multiplying the same fire.</Cap>
    </figure>
  );
}

// Step 3: the kinds of heat that are removed.
export function NonFireDiagram() {
  const kinds = [['Volcanoes', 'NASA type: active volcano'], ['Gas flares and industry', 'NASA type: other static land source'],
    ['Offshore platforms', 'NASA type: offshore'], ['Persistent heat cells', 'S.H.I.F.T mask: same place, year after year']];
  return (
    <figure className="m-fig">
      <ul className="m-chips">{kinds.map(([k, s]) => <li key={k}><b>{k}</b><span>{s}</span></li>)}</ul>
      <Cap>What is taken out before anything is counted, in every year.</Cap>
    </figure>
  );
}

// Step 4: the grids, nested (not to scale).
export function GridDiagram() {
  const [hi, setHi] = useState('calib');
  const items = [['activity', '0.05°', 'hotspot cell (about 5 km)'], ['map', '0.25°', 'map squares'], ['area', '1°', 'areas are summed on these'],
    ['calib', '2.5°', 'one factor per cell and month'], ['tile', '10°', 'sparse cells lean on this tile']];
  return (
    <figure className="m-fig m-grid">
      <svg viewBox="0 0 200 200" role="img" aria-label="Nested grids from 10 degrees down to 0.05 degrees, not to scale">
        <rect x="4" y="4" width="192" height="192" className={`m-g tile ${hi === 'tile' ? 'on' : ''}`} />
        {[0, 1, 2, 3].flatMap((i) => [0, 1, 2, 3].map((j) => <rect key={`${i}${j}`} x={4 + i * 48} y={4 + j * 48} width="48" height="48" className="m-g sub" />))}
        <rect x="100" y="100" width="48" height="48" className={`m-g calib ${hi === 'calib' ? 'on' : ''}`} />
        <rect x="110" y="110" width="20" height="20" className={`m-g area ${hi === 'area' ? 'on' : ''}`} />
        <rect x="112" y="112" width="8" height="8" className={`m-g map ${hi === 'map' ? 'on' : ''}`} />
        <rect x="113" y="113" width="3" height="3" className={`m-g activity ${hi === 'activity' ? 'on' : ''}`} />
      </svg>
      <ul className="m-legend">
        {items.map(([k, d, t]) => <li key={k}><button type="button" className={hi === k ? 'on' : ''} aria-pressed={hi === k}
          onClick={() => setHi(k)} onFocus={() => setHi(k)}><b>{d}</b> {t}</button></li>)}
      </ul>
      <Cap>Illustration, not to scale. Choose a grid to highlight it.</Cap>
    </figure>
  );
}

// Step 5: a strip of days: seen, filled, no data.
export function GapDiagram() {
  const days = 'ppppfffpppppnnppppfpppp'.split('');
  return (
    <figure className="m-fig">
      <svg viewBox="0 0 300 54" role="img" aria-label="Days seen by the main satellite, days filled by a partner, and days with no data">
        {days.map((d, i) => <rect key={i} x={6 + i * 12.5} y="8" width="11" height="22" className={`m-day ${d}`} />)}
      </svg>
      <ul className="m-keyrow"><li><i className="m-day p" />seen by the main satellite</li><li><i className="m-day f" />filled from a partner</li>
        <li><i className="m-day n" />no data (hatched on the site)</li></ul>
      <Cap>Illustration, not real days.</Cap>
    </figure>
  );
}

// Step 6: the record as two pieces on one scale.
export function RecordDiagram() {
  return (
    <figure className="m-fig">
      <svg viewBox="0 0 560 70" role="img" aria-label="2002 to 2011: MODIS times the factor, with a range. From 20 January 2012: Suomi NPP">
        <rect x="20" y="16" width="200" height="26" rx="4" className="m-bar src" />
        <rect x="222" y="16" width="318" height="26" rx="4" className="m-bar ref" />
        <text x="30" y="34" className="m-barlabel">MODIS × factor, with a range</text>
        <text x="232" y="34" className="m-barlabel">Suomi NPP (gaps filled from NOAA-20)</text>
        <text x="20" y="60" className="m-axis">2002</text><text x="222" y="60" className="m-axis">20 Jan 2012</text><text x="540" y="60" className="m-axis" textAnchor="end">28 Oct 2026</text>
      </svg>
      <Cap>Illustration of the harmonised record: one scale from 2002 to the newest data. The recent detections layer is separate and not part of it.</Cap>
    </figure>
  );
}

export const DIAGRAMS = { collect: CollectDiagram, hotspots: HotspotDiagram, nonfire: NonFireDiagram, calibrate: GridDiagram, gaps: GapDiagram, record: RecordDiagram };
