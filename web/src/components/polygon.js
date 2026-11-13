// A drawn polygon as a SHIFT area (UI lab, 14 Nov 2026). It uses the same rule as a country in lib/area.js:
// a 1-degree cell belongs to the area when its centre is inside the shape, and a shape too small to hold
// any centre gets the cell its middle sits in. So the numbers come from the existing daily files and sums,
// with no new method and nothing interpolated. Pure functions, no imports, so the tests can run them.

export const MAX_CORNERS = 40;

const wrap = (lon) => ((((lon + 180) % 360) + 360) % 360) - 180;
const r2 = (x) => Math.round(x * 100) / 100;
const cellId = (lat, lon) => (Math.floor(lat) + 90) * 360 + (Math.floor(lon) + 180);   // as lib/data.js

// Corners as the map gives them ([lon, lat], longitudes may run past ±180 on a wrapped 2D map).
// Returns { ring } or { error }. The ring is open (first corner not repeated).
export function cleanRing(corners) {
  const pts = (corners || []).map(([lon, lat]) => [wrap(lon), Math.max(-89.99, Math.min(89.99, lat))]);
  const ring = pts.filter((p, i) => i === 0 || p[0] !== pts[i - 1][0] || p[1] !== pts[i - 1][1]);
  if (ring.length < 3) return { error: 'A shape needs at least three corners.' };
  if (ring.length > MAX_CORNERS) return { error: `Use at most ${MAX_CORNERS} corners.` };
  // a side longer than 180 degrees of longitude crosses the date line (the shorter way round): refused,
  // like boxes, because the 1-degree cells would be taken from the wrong side of the Earth
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    if (Math.abs(b[0] - a[0]) > 180) return { error: 'Shapes across the date line (180°) are not supported. Draw it on one side.' };
  }
  let area2 = 0;
  for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length]; area2 += a[0] * b[1] - b[0] * a[1]; }
  if (Math.abs(area2) < 1e-6) return { error: 'The corners lie on one line. Draw a shape with some area.' };
  return { ring: ring.map(([x, y]) => [r2(x), r2(y)]) };
}

function inRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function bboxOf(ring) {
  let w = 180, s = 90, e = -180, n = -90;
  for (const [x, y] of ring) { w = Math.min(w, x); e = Math.max(e, x); s = Math.min(s, y); n = Math.max(n, y); }
  return { w, s, e, n };
}

// The area object the rest of the page uses (same fields as lib/area.js areas).
export function polygonArea(ring) {
  const b = bboxOf(ring);
  const cells = [];
  for (let la = Math.floor(b.s); la < Math.ceil(b.n); la++)
    for (let lo = Math.floor(b.w); lo < Math.ceil(b.e); lo++)
      if (inRing(lo + 0.5, la + 0.5, ring)) cells.push(cellId(la, lo));
  if (!cells.length) {
    const cx = ring.reduce((t, p) => t + p[0], 0) / ring.length, cy = ring.reduce((t, p) => t + p[1], 0) / ring.length;
    cells.push(cellId(Math.min(89.9, cy), Math.min(179.9, cx)));
  }
  const closed = [...ring, ring[0]];
  return { id: 'polygon', kind: 'polygon', name: `Custom shape (${ring.length} corners)`, box: b,
    geom: { type: 'Polygon', coordinates: [closed] }, cells, ring,
    spec: `poly:${ring.map(([x, y]) => `${x} ${y}`).join(';')}` };
}

// A share link back to an area: "poly:lon lat;lon lat;..." -> area, or null if it does not pass cleanRing.
export function polygonFromSpec(spec) {
  if (!spec?.startsWith('poly:')) return null;
  const pts = spec.slice(5).split(';').map((p) => p.trim().split(/\s+/).map(Number));
  if (!pts.every((p) => p.length === 2 && p.every(Number.isFinite))) return null;
  if (pts.some(([x, y]) => Math.abs(x) > 180 || Math.abs(y) > 90)) return null;
  const c = cleanRing(pts);
  return c.ring ? polygonArea(c.ring) : null;
}
