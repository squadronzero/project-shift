// Fullscreen for the map side of Explore (14 Nov). The same map, the same state: only the presentation changes.
// Browser fullscreen where the page may use it (asked for only from a click, tap or key), otherwise a fixed layer
// that fills the browser window (iPhone Safari, embedded browsers, a refused request). Never leaves the page half way.
import { useCallback, useEffect, useRef, useState } from 'react';
import { enterFullscreen, nativeApi } from './fullscreenApi.js';

export { enterFullscreen, nativeApi };

// Everything on the page outside `el` is made inert while fullscreen is on, so Tab cannot wander into the hidden
// dashboard. Returns the undo.
export function inertOutside(el) {
  const done = [];
  for (let node = el; node && node.parentElement && node !== document.body; node = node.parentElement) {
    for (const sib of node.parentElement.children) {
      if (sib !== node && !sib.inert) { sib.inert = true; done.push(sib); }
    }
  }
  return () => { for (const s of done) s.inert = false; };
}

// mode: null (normal), 'viewport' (fills the window) or 'native' (browser fullscreen).
// canEscape(event) says whether Escape should leave the window-filling layer (the browser handles native Escape).
export function useFullscreen(ref, { canEscape = () => true } = {}) {
  const [mode, setMode] = useState(null);
  const opener = useRef(null);
  const scrollY = useRef(0);
  const was = useRef(null);
  const jump = useRef(false);
  const escRef = useRef(canEscape);
  escRef.current = canEscape;

  const enter = useCallback(async (from) => {
    if (mode) return;
    opener.current = from || document.activeElement;
    scrollY.current = window.scrollY;
    setMode('viewport');                              // the layer first, so a refused request still gives a big map
    const how = await enterFullscreen(ref.current);
    setMode((m) => (m ? how : m));                    // left again while the browser was deciding: stay left
  }, [mode, ref]);

  // focusTo: where focus goes afterwards (default: the button that opened fullscreen); the page scrolls to it
  const exit = useCallback((focusTo) => {
    if (focusTo && focusTo.nodeType === 1) { opener.current = focusTo; jump.current = true; }
    const api = nativeApi(ref.current);
    if (api.current()) { Promise.resolve(api.exit()).catch(() => setMode(null)); return; }   // fullscreenchange finishes it
    setMode(null);
  }, [ref]);

  // the browser's own exit (Escape, F11, a system gesture) ends the mode too, so the page never shows stale controls
  useEffect(() => {
    const onChange = () => {
      const cur = nativeApi(ref.current).current();
      setMode((m) => (cur === ref.current ? 'native' : m === 'native' ? null : m));
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => { document.removeEventListener('fullscreenchange', onChange); document.removeEventListener('webkitfullscreenchange', onChange); };
  }, [ref]);

  // while on: the rest of the page is inert, the page does not scroll behind, Escape leaves the window-filling layer
  useEffect(() => {
    if (!mode || !ref.current) return undefined;
    const undo = inertOutside(ref.current);
    document.documentElement.classList.add('fs-lock');
    const onKey = (e) => {
      if (e.key !== 'Escape' || nativeApi(ref.current).current()) return;
      if (e.defaultPrevented || e.target.closest?.('input, select, textarea, [role=listbox]') || !escRef.current(e)) return;
      setMode(null);
    };
    window.addEventListener('keydown', onKey);
    return () => { undo(); document.documentElement.classList.remove('fs-lock'); window.removeEventListener('keydown', onKey); };
  }, [mode != null, ref]);   // eslint-disable-line react-hooks/exhaustive-deps

  // on: focus moves into the workspace (its exit button), so keyboard users start inside it.
  // back to normal: the page scroll and the focus return to where they were
  useEffect(() => {
    if (!was.current && mode) ref.current?.querySelector('[data-fs-first]')?.focus({ preventScroll: true });
    if (was.current && !mode) {
      window.scrollTo(0, scrollY.current);
      const o = opener.current;
      if (o && document.contains(o)) o.focus({ preventScroll: !jump.current });
      else document.querySelector('.fs-enter')?.focus({ preventScroll: true });
    }
    was.current = mode;
    if (!mode) jump.current = false;
  }, [mode]);

  // leaving the page (another tab of the site) while fullscreen: give the browser its window back
  useEffect(() => () => { const api = nativeApi(ref.current); if (api.current()) api.exit()?.catch?.(() => {}); }, [ref]);

  return { mode, full: mode != null, enter, exit };
}
