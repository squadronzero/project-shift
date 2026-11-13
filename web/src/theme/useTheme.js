// Reads the colours in tokens.css so the map (MapLibre) and the canvas/SVG charts draw with
// exactly the same values as the rest of the page. Edit colours in tokens.css, not here.
import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';


function read() {
  const cs = getComputedStyle(document.documentElement);
  const v = (name) => cs.getPropertyValue(name).trim();
  return {
    name: document.documentElement.dataset.theme || 'light',
    // Browsers report the font list with double quotes ("Archivo Variable", ...). The chart image
    // export writes it into an SVG attribute that is itself in double quotes, so double quotes there
    // break the file (the SVG will not open and the PNG is never made). Single quotes mean the same font.
    font: v('--font-body').replace(/"/g, "'"),
    surface: v('--surface'), ink: v('--ink'), muted: v('--muted'), rule: v('--rule'), accent: v('--accent'),
    sea: v('--map-sea'), land: v('--map-land'), border: v('--map-border'), area: v('--map-area'),
    select: v('--map-select'), gap: v('--map-gap'), space: v('--globe-space'), horizon: v('--globe-horizon'),
    geo: { intl: v('--map-border-intl'), adm1: v('--map-border-adm1'), adm2: v('--map-border-adm2'),
      label: v('--map-label'), water: v('--map-label-water'), halo: v('--map-label-halo') },
    recent: [1, 2, 3, 4].map((i) => v(`--recent-${i}`)), recentStroke: v('--recent-stroke'), recentNonfire: v('--recent-nonfire'),
    zero: v('--chart-zero'),
    ramp: [1, 2, 3, 4, 5, 6].map((i) => v(`--ramp-${i}`)),
    cls: { low: v('--class-low'), normal: v('--class-normal'), unusual: v('--class-unusual'), critical: v('--class-critical') },
    line: v('--chart-line'), band: v('--chart-band'), highlight: v('--chart-highlight'),
    nodataBg: v('--nodata-bg'), nodataLine: v('--nodata-line'), cloud: v('--cloud-mark'),
    volcano: v('--notfire-volcano'), industry: v('--notfire-industry'), offshore: v('--notfire-offshore'),
  };
}

// Dark only (Squadron Zero, 14 Nov). The light colours stay in tokens.css (:root) and are used for printing
// only: dark text colours on white paper would be unreadable, so the page switches to light just before the
// browser prints and back afterwards (flushSync redraws the charts before the print is taken).
// Returns [theme, mode, setMode] as before so callers do not change.
export default function useTheme() {
  const [printing, setPrinting] = useState(false);
  const resolved = printing ? 'light' : 'dark';
  document.documentElement.dataset.theme = resolved;
  const [theme, setTheme] = useState(read);
  useEffect(() => {
    const before = () => { document.documentElement.dataset.theme = 'light'; flushSync(() => { setPrinting(true); setTheme(read()); }); };
    const after = () => { document.documentElement.dataset.theme = 'dark'; setPrinting(false); setTheme(read()); };
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => { window.removeEventListener('beforeprint', before); window.removeEventListener('afterprint', after); };
  }, []);
  useEffect(() => { setTheme(read()); }, [resolved]);
  return [theme.name === resolved ? theme : read(), resolved, () => {}];
}
