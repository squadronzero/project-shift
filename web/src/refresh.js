// The S.H.I.F.T brand as a home-and-refresh control (14 Nov 2026). It reloads the WEBSITE and its PUBLISHED
// data. It never starts a FIRMS download or the pipeline: the recent detections are refreshed only by the
// Website workflow. Before reloading it re-asks the server for the page and the two small "what is published"
// files with cache: 'reload', which also replaces their copies in the browser cache, so the reloaded page reads
// the newest published versions instead of a copy up to 10 minutes old. The recent detections are tied to one
// snapshot id per view (lib/recent.js), so they never mix two fetches. The record's daily and monthly files
// are NOT versioned by name: they change only when a new site-data release is published (the last one was
// 7 Nov 2026), and GitHub Pages lets a browser keep them for up to 10 minutes. So in the first 10 minutes after
// a new release, a view could mix new meta.json with older cached tiles. With today's single release this
// cannot happen. If the site cannot be reached, nothing is reloaded (an offline reload would show the
// browser's error page instead of the data already on screen).
const KEY = 'shift-refresh-before';
const ok = (r) => r && r.ok;

export async function checkAndReload(before, base = '') {
  const tries = await Promise.allSettled([
    fetch(`${base}index.html`, { cache: 'reload' }),
    fetch(`${base}data/meta.json`, { cache: 'reload' }),
    fetch(`${base}data/recent/status.json`, { cache: 'reload' }),
  ]);
  const reached = tries.some((t) => t.status === 'fulfilled' && ok(t.value));
  if (!reached) return false;
  try { sessionStorage.setItem(KEY, JSON.stringify(before)); } catch { /* private mode: no "newer data" note */ }
  location.replace(`${location.pathname}${location.search}#explore`);
  location.reload();
  return true;
}

// After the reload: was anything newer published? Compares the versions seen before the click with the ones
// loaded now. Returns null when nothing changed, so the page never claims an update that did not happen.
export function newerThanBefore(now) {
  let before = null;
  try { before = JSON.parse(sessionStorage.getItem(KEY) || 'null'); sessionStorage.removeItem(KEY); } catch { return null; }
  if (!before) return null;
  const record = !!(now.meta && before.meta && now.meta !== before.meta);
  const recent = !!(now.recent && before.recent && now.recent !== before.recent);
  return record || recent ? { record, recent } : null;
}
