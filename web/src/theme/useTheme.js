// Reads the colours in tokens.css so the map (MapLibre) and the canvas/SVG charts draw with
// exactly the same values as the rest of the page. Edit colours in tokens.css, not here.
import { useEffect, useState } from 'react';


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

// UI lab (14 Nov, Squadron Zero): dark only. The light colours stay in tokens.css (:root), but the page always
// uses the dark set, and the theme picker is gone. Returns [theme, mode, setMode] as before so callers do not change.
export default function useTheme() {
  document.documentElement.dataset.theme = 'dark';
  const [theme, setTheme] = useState(read);
  useEffect(() => { setTheme(read()); }, []);
  return [theme.name === 'dark' ? theme : read(), 'dark', () => {}];
}
