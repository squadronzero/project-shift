// The map legend. It reads the same steps as the map (lib/geo.js), so the two cannot disagree.
// Since 12 Nov it is compact on the map (title and swatches only); the three explanation sentences, the gap
// hatching note and the picture note sit under the map (Explore.jsx, "mapnotes"), so the legend no longer covers it.
import T from '../content/text.js';
import { legendRows } from '../lib/geo.js';

export default function MapLegend({ theme, variable, month, showGaps, imageryLabel, compact = false }) {
  const rows = legendRows(variable, theme.ramp);
  return (
    <div className="maplegend">
      <b>{T.map.legendTitle(variable, month)}</b>
      <ul>
        {rows.map((r) => <li key={r.label}><span className="swatch" style={{ background: r.colour }} />{r.label}</li>)}
        {showGaps && <li><span className="swatch hatch" />no data (hatched)</li>}
      </ul>
      {!compact && <>
        <p>{T.map.legendUnit[variable]}</p>
        <p>{T.map.legendScale}</p>
        <p>{T.map.legendSupport}</p>
        {showGaps && <p><span className="swatch hatch" /> {T.map.legendGaps}</p>}
        {imageryLabel && <p><b>{imageryLabel}.</b> {T.map.imageryNote}</p>}
      </>}
    </div>
  );
}
