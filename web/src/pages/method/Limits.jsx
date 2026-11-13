// Limitations and data sources (redesign, 14 Nov 2026). The limitation texts are the corrected wording of
// 11 Nov 2026 (docs/audit/SCIENTIFIC_CLAIMS_CORRECTION_2026-11-11.md), kept word for word and grouped. The range
// limitation is never folded away.
import { useMemo, useState } from 'react';
import { SOURCES, SOURCE_GROUPS, USES } from './content.js';

export function ScientificLimits({ last }) {
  const [all, setAll] = useState(false);
  const groups = [
    { id: 'calib', title: 'Sensor and calibration',
      summary: 'Before 2012 the VIIRS-to-MODIS ratio cannot be measured, so the conversion assumes it held. A few regions keep a small step at 2012.',
      items: [
        <li key="a">Three test regions keep a 2012 step near 10% after harmonising, depending on how it is measured: Iberia +9 to +12%
          (flagged, with extra uncertainty), Florida -7 to -9% and Siberia about -9%. Year-to-year wobble in the VIIRS to MODIS
          ratio is about 3 to 10% in single regions, so gaps of this size are at the edge of what can be told apart from noise.</li>,
        <li key="b">NOAA-21 (VIIRS since 2023) is not used in the harmonised record: it was not tested against the others in time. It appears only in the recent detections layer, labelled as not tested.</li>,
        <li key="c">From July 2026 the Suomi NPP data in the record is NASA's near-real-time version, which has no fire-type label, so only S.H.I.F.T's persistent non-fire mask removes non-fire heat. Treat 2026 values from July as provisional until NASA's final science data replaces them.</li>,
        <li key="d">From February 2023 Aqua flies past its 13:45 science limit, so it no longer fills Suomi NPP gaps.</li>,
      ] },
    { id: 'space', title: 'Space and time',
      summary: 'Areas are summed on 1° cells (about 100 km), and day-level values before 2012 are indicative. Months over large areas are the most dependable reading.',
      items: [
        <li key="a">Areas are summed on a 1° grid, so the edges of any area are accurate to about 100 km.</li>,
        <li key="b">Four grids are used: 0.05° cells decide what is a hotspot, the map draws 0.25° squares, areas are summed on 1° cells, and the conversion factors belong to 2.5° cells (sparse ones lean on their 10° tile).</li>,
        <li key="c">Day-level and week-level values and dated critical periods before 20 January 2012 are indicative; months are tested.</li>,
        <li key="d">January to June 2002 has Terra only and is not compared with later years.</li>,
      ] },
    { id: 'gaps', title: 'Observation gaps',
      summary: 'Cloud and smoke hide fire from every satellite. Days no satellite saw are shown as gaps, never as quiet days.',
      items: [
        <li key="a">Cloud and smoke hide fires from every satellite. A cloudy day can look like a quiet one; months cloudier than 90% of years carry a flag.</li>,
        last && <li key="b">The harmonised record runs to {last}. From 28 October 2026 the map also offers <b>recent detections</b>:
          raw NASA FIRMS near-real-time points from VIIRS on NOAA-20 and NOAA-21, fetched every few hours and labelled with the
          fetch time. Their periods (24 hours, 7 days) end at the newest detection, not at the current time. If a
          refresh fails, the last complete dataset is kept unchanged and marked as not current, and a dataset with
          missing days says which ones are missing. They are not on the harmonised scale, are never added to the record's numbers and are never given an
          anomaly score. NASA FIRMS stopped producing new data from S-NPP, the record's reference satellite, at 13:00 UTC on 2 November 2026. S.H.I.F.T measured
          NOAA-20 against S-NPP (1.00 to 1.05). NOAA-21 has not been tested against S-NPP by S.H.I.F.T. Detections in S.H.I.F.T's
          persistent non-fire cells are shown in grey, and low-confidence detections are drawn faint and not counted.</li>,
      ].filter(Boolean) },
    { id: 'range', title: 'Uncertainty ranges', open: true,
      summary: 'The range on values before 2012 covers the conversion error only. It is a guide, not a guaranteed bound.',
      items: [
        <li key="a">Before 2012 every value carries a calibrated 95% range for the MODIS-to-VIIRS conversion, wider where fire is sparse.
          It covers only that conversion error, as measured in the years both sensors flew. It does not include fire hidden by cloud
          or smoke, false detections, any change in the VIIRS to MODIS ratio before 2012 (which cannot be measured), or the larger
          errors of single days and small areas. In a check on 2012 to 2015, about 94 to 95% of cell-months fell inside, but that
          check was not fully independent of how the ranges were set, and the ranges it checked are built a little differently
          from the published ones (see the Validation page). Read the range as a guide to the conversion error, not as a guaranteed
          95% bound on the true value.</li>,
      ] },
    { id: 'classes', title: 'Anomalies and interpretation',
      summary: 'Unusual and Critical are statistical classes for that place and month, not danger ratings or warnings.',
      items: [
        <li key="a">Unusual and Critical months are statistically extreme for that place and month. They are not fire danger ratings or emergency warnings.</li>,
        <li key="b">About one in four unusual months in the MODIS years would not be unusual to VIIRS; those months are marked.</li>,
        <li key="c">Where a normal year has fewer than 60 hotspots, the page does not summarise the month classes and marks their colours as noise.</li>,
        <li key="d">The weather comes from a reanalysis (a weather model guided by observations) on a grid of about 50 to 70 km, not from
          stations at the fires. The newest weeks are near-real-time values that NASA may revise, and are marked provisional.</li>,
      ] },
  ];
  return (
    <section id="limits" className="m-sec" aria-labelledby="m-limits">
      <div className="m-sec-head">
        <h3 id="m-limits">What to keep in mind</h3>
        <button type="button" className="linkbtn" aria-pressed={all} onClick={() => setAll((a) => !a)}>{all ? 'Show summaries only' : 'Read the complete limitations'}</button>
      </div>
      <div className="m-limits">
        {groups.map((g) => (
          <article key={g.id} className={`m-limit ${g.open ? 'key' : ''}`}>
            <h4>{g.title}</h4>
            <p className="m-limit-sum">{g.summary}</p>
            {g.open ? <ul>{g.items}</ul> : (
              <details className="define" open={all}><summary>{g.items.length} point{g.items.length === 1 ? '' : 's'}</summary><ul>{g.items}</ul></details>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

export function SourceLibrary({ meta }) {
  const [group, setGroup] = useState('all');
  const [q, setQ] = useState('');
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return SOURCES.filter((s) => (group === 'all' || s.group === group)
      && (!t || [s.name, s.org, s.id, s.detail, USES[s.use]].join(' ').toLowerCase().includes(t)));
  }, [group, q]);
  return (
    <section id="sources" className="m-sec" aria-labelledby="m-sources">
      <h3 id="m-sources">Data sources</h3>
      <p className="small">Only the sources marked "Builds the fire record" make the fire numbers. The others are checks, context or map pictures.</p>
      <div className="m-filter">
        <div className="seg" role="group" aria-label="Category">
          {[['all', 'All'], ...Object.entries(SOURCE_GROUPS)].map(([k, l]) => <button key={k} type="button" className={group === k ? 'on' : ''}
            aria-pressed={group === k} onClick={() => setGroup(k)}>{l}</button>)}
        </div>
        <label className="m-find">Find<input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="for example VIIRS, cloud, licence" /></label>
      </div>
      <p className="small muted" aria-live="polite">{shown.length} of {SOURCES.length} sources</p>
      <div className="m-srcs">
        {shown.map((s) => (
          <article key={s.name} className="m-src">
            <p className={`m-use use-${s.use}`}>{USES[s.use]}</p>
            <h4>{s.name}</h4>
            <p className="small">{s.org}{s.dates ? ` · ${s.dates}` : ''}{s.units ? ` · ${s.units}` : ''}</p>
            <p className="small">{s.detail}</p>
            <p className="small"><a href={s.link}>{s.id}</a></p>
          </article>
        ))}
        {!shown.length && <p className="muted">No source matches. Try another word or "All".</p>}
      </div>
      <div className="m-ack small">
        <p>Country borders: Natural Earth, via world-atlas. Map place names and boundaries are context only, never used in any number.
          Country names and international borders follow Natural Earth's de facto view, and lower-level boundaries come from national or
          humanitarian sources, so lines can differ where countries disagree. S.H.I.F.T takes no position on any boundary. Details per
          country: <code>web/public/geo/index.json</code> and <code>geo/README.md</code>.</p>
        <p>We acknowledge the use of data and imagery from NASA's Fire Information for Resource Management System (FIRMS),
          part of NASA's Earth Science Data and Information System (ESDIS). We acknowledge the use of imagery provided by
          services from NASA's Global Imagery Browse Services (GIBS), part of NASA's Earth Science Data and Information System (ESDIS).</p>
        <p>The weather data was obtained from the National Aeronautics and Space Administration (NASA) Langley Research Center's
          Prediction Of Worldwide Energy Resources (POWER) project funded through the NASA Earth Science Division.</p>
        {meta && <p>This release covers {meta.start} to {meta.end}, generated {meta.generated_utc.slice(0, 10)}.
          Code, every test and every decision: <a href="https://github.com/squadronzero/project-shift">github.com/squadronzero/project-shift</a>.
          To run offline, serve the site folder with any static server (for example <code>python -m http.server</code>) and open it in a browser.</p>}
      </div>
    </section>
  );
}
