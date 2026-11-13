// The search bar's brain (UI lab, 14 Nov 2026): matching typed text against SHIFT's own countries and
// presets, and reading typed coordinates. Pure functions with no imports, so the tests can run them.
// It never invents a place: every suggestion is an item from the lists it is given.

// ---------------------------------------------------------------- names
// Lower case, no accents, abbreviations of the Natural Earth names written out, single spaces.
const ABBR = [
  [/\bis\./g, 'islands'], [/\bi\./g, 'island'], [/\brep\./g, 'republic'], [/\bdem\./g, 'democratic'],
  [/\bst\./g, 'saint'], [/\bherz\./g, 'herzegovina'], [/\beq\./g, 'equatorial'], [/\bfr\./g, 'french'],
  [/\bbr\./g, 'british'], [/\bn\./g, 'northern'], [/\bs\./g, 'south'], [/\bw\./g, 'western'],
  [/\bbarb\./g, 'barbuda'], [/\bgren\./g, 'grenadines'], [/\bvin\./g, 'vincent'], [/\bgeo\./g, 'georgia'],
  [/\bter\./g, 'territory'],
];
export function norm(s) {
  let t = String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  for (const [re, full] of ABBR) t = t.replace(re, full);
  return t.replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
}

// Other names people type for a country, keyed by the country's SHIFT id (Natural Earth name, see lib/area.js).
export const ALIASES = {
  'united-states-of-america': ['usa', 'us', 'united states', 'america'],
  'united-kingdom': ['uk', 'great britain', 'britain', 'england', 'scotland', 'wales'],
  'dem-rep-congo': ['drc', 'dr congo', 'congo kinshasa', 'democratic republic of the congo'],
  congo: ['republic of the congo', 'congo brazzaville'],
  'cote-d-ivoire': ['ivory coast'],
  czechia: ['czech republic'],
  myanmar: ['burma'],
  macedonia: ['north macedonia'],
  'timor-leste': ['east timor'],
  'south-korea': ['korea', 'republic of korea'],
  'north-korea': ['dprk'],
  laos: ['lao'],
  russia: ['russian federation'],
  eswatini: ['swaziland'],
  'bosnia-and-herz': ['bosnia'],
  'central-african-rep': ['car'],
};

// Score one name against the typed text: 3 the name starts with it, 2 a word starts with it, 1 it is inside.
function score(name, q) {
  if (!q) return 0;
  if (name.startsWith(q)) return 3;
  if (name.split(' ').some((w) => w.startsWith(q)) || name.includes(` ${q}`)) return 2;
  return name.includes(q) ? 1 : 0;
}

// countries: [{ id, name }], presets: [{ id, name }]. Returns up to `limit` suggestions
// [{ kind: 'country'|'preset', id, name }], best first, ties alphabetical, countries before presets.
export function matchPlaces(text, countries, presets, limit = 8) {
  const q = norm(text);
  if (!q) return [];
  const out = [];
  for (const c of countries) {
    const names = [norm(c.name), ...(ALIASES[c.id] || [])];
    const s = Math.max(...names.map((n) => score(n, q)));
    if (s) out.push({ kind: 'country', id: c.id, name: c.name, s });
  }
  for (const p of presets) {
    const s = score(norm(p.name), q);
    if (s) out.push({ kind: 'preset', id: p.id, name: p.name, s });
  }
  out.sort((a, b) => b.s - a.s || (a.kind === b.kind ? 0 : a.kind === 'country' ? -1 : 1) || a.name.localeCompare(b.name));
  return out.slice(0, limit).map(({ s, ...r }) => r);
}

// ---------------------------------------------------------------- coordinates
// Plain decimal degrees only, separated by commas, spaces or semicolons. The order is fixed and stated:
//   2 numbers: latitude, longitude (a point with the default radius)
//   3 numbers: latitude, longitude, radius in km
//   4 numbers: west, south, east, north (a box, the order SHIFT's links and Coordinates form use)
// Nothing is swapped or guessed. Anything else returns { error }.
export const DEFAULT_KM = 50;
const NUM = /^[-+]?\d+(\.\d+)?$/;

export function looksLikeCoords(text) {
  return /^[\s\d.,;+-]+$/.test(String(text || '')) && /\d/.test(text);
}

export function parseCoords(text) {
  const parts = String(text || '').trim().split(/[\s,;]+/).filter(Boolean);
  if (!parts.length || !parts.every((p) => NUM.test(p))) {
    return { error: 'Use decimal degrees: "latitude, longitude", "latitude, longitude, km" or "west, south, east, north".' };
  }
  const v = parts.map(Number);
  if (v.length === 2 || v.length === 3) {
    const [lat, lon, km = DEFAULT_KM] = v;
    if (Math.abs(lat) > 90) {
      return { error: Math.abs(lon) <= 90
        ? `Latitude ${lat} is outside -90 to 90. A point is written latitude first, then longitude.`
        : `Latitude ${lat} is outside -90 to 90.` };
    }
    if (Math.abs(lon) > 180) return { error: `Longitude ${lon} is outside -180 to 180.` };
    if (!(km > 0 && km <= 1500)) return { error: 'The radius must be 1 to 1500 km.' };
    return { kind: 'point', lat, lon, km };
  }
  if (v.length === 4) {
    const [w, s, e, n] = v;
    if (Math.abs(s) > 90 || Math.abs(n) > 90) return { error: 'South and north must be latitudes from -90 to 90 (order: west, south, east, north).' };
    if (Math.abs(w) > 180 || Math.abs(e) > 180) return { error: 'West and east must be longitudes from -180 to 180 (order: west, south, east, north).' };
    if (s >= n) return { error: 'South must be smaller than north (order: west, south, east, north).' };
    if (w >= e) return { error: 'West must be smaller than east. Boxes across the date line are not supported.' };
    return { kind: 'box', w, s, e, n };
  }
  return { error: `${v.length} numbers: use 2 (latitude, longitude), 3 (with a radius in km) or 4 (west, south, east, north).` };
}
