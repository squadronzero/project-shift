// Areas with too little fire to class months (judging audit P1, 14 Nov 2026).
// The month classes use z of log(1 + hotspots). Where a normal month has zero or one hotspot,
// a single detection gives a z of 5 or more, so quiet places (Greenland, Luxembourg, the Sahara)
// showed many "critical" months that are only noise. This is a display rule: no number, class
// or file changes. The page only stops summarising the classes and says why.
// Threshold, chosen on 14 Nov 2026 after looking at a few areas (normal year: Greenland box 2
// hotspots, Sahara box 3, Luxembourg 16, a 50 km point at Dhaka 147, Fiji 187): 60 hotspots in a
// normal year, about five a month. It is a judgement, not a tested optimum.

export const QUIET_MIN_HOTSPOTS_PER_YEAR = 60;

// Median yearly hotspot total over the baseline years, from monthly rows of the hotspots variable
// ({ rows: [{ year, value }], baseline: [first, last] }).
export function normalYearHotspots(monCells) {
  if (!monCells?.rows?.length) return 0;
  const [b0, b1] = monCells.baseline;
  const byYear = new Map();
  for (const r of monCells.rows) {
    if (r.year < b0 || r.year > b1) continue;
    byYear.set(r.year, (byYear.get(r.year) || 0) + r.value);
  }
  const totals = [...byYear.values()].sort((a, b) => a - b);
  if (!totals.length) return 0;
  const m = totals.length >> 1;
  return totals.length % 2 ? totals[m] : (totals[m - 1] + totals[m]) / 2;
}

export const isQuietArea = (monCells) => normalYearHotspots(monCells) < QUIET_MIN_HOTSPOTS_PER_YEAR;
