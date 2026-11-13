// One search bar for choosing the area (UI lab, 14 Nov 2026): type a country, a SHIFT preset or coordinates,
// draw a shape with the pen, or open "Choose instead" for the structured forms. Every route ends in the same
// area objects as before (lib/area.js, components/polygon.js), so the analysis below is unchanged.
// Keyboard: arrows move through suggestions, Enter picks, Escape closes (and cancels a shape being drawn).
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import T from '../content/text.js';
import PLACES from '../content/places.js';
import { COUNTRIES, boxArea, countryArea, pointArea, presetArea } from '../lib/area.js';
import { looksLikeCoords, matchPlaces, parseCoords } from './search.js';
import AreaPicker from './AreaPicker.jsx';

const r2 = (x) => Math.round(x * 100) / 100;
const deg = (v, pos, neg) => `${Math.abs(r2(v))}°${v >= 0 ? pos : neg}`;

export default function SearchBar({ area, setArea, setError, drawing, setDrawing, draftCorners = 0, drawCommand }) {
  const S = T.search;
  const [text, setText] = useState('');
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [manual, setManual] = useState(null);      // 'preset' | 'country' | 'box' | 'point' from "Choose instead"
  const [menu, setMenu] = useState(false);
  const input = useRef(null);
  const menuRef = useRef(null);
  const id = useId();

  // the bar shows the chosen area when nobody is typing in it (Squadron Zero, 14 Nov)
  const shown = editing ? text : (area?.name || '');

  const items = useMemo(() => {
    const q = text.trim();
    if (!q) return [];
    if (looksLikeCoords(q)) {
      const c = parseCoords(q);
      if (c.error) return [{ kind: 'error', label: c.error }];
      if (c.kind === 'point') return [{ kind: 'point', c, label: S.pointItem(deg(c.lat, 'N', 'S'), deg(c.lon, 'E', 'W'), c.km) }];
      return [{ kind: 'box', c, label: S.boxItem(c.w, c.s, c.e, c.n) }];
    }
    return matchPlaces(q, COUNTRIES, PLACES).map((m) => ({ ...m, label: m.name }));
  }, [text, S]);
  const choosable = items.filter((x) => x.kind !== 'error');

  const choose = (it) => {
    if (!it || it.kind === 'error') return;
    let a = null;
    if (it.kind === 'country') a = countryArea(COUNTRIES.find((c) => c.id === it.id));
    if (it.kind === 'preset') a = presetArea(PLACES.find((p) => p.id === it.id));
    if (it.kind === 'point') a = pointArea(it.c.lat, it.c.lon, it.c.km);
    if (it.kind === 'box') a = boxArea(it.c);
    if (!a) return;
    setError(null); setArea(a);
    setText(''); setEditing(false); setOpen(false); setManual(null);
    input.current?.blur();
  };

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((i) => Math.min(i + 1, Math.max(choosable.length - 1, 0))); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(choosable[active]); }
    else if (e.key === 'Escape') { setOpen(false); setText(''); setEditing(false); input.current?.blur(); }
  };

  // Escape also cancels a shape being drawn; the menu closes on Escape or a click outside it
  useEffect(() => {
    const onDoc = (e) => {
      if (e.key === 'Escape') { if (drawing) drawCommand('cancel'); setMenu(false); }
      if (e.type === 'mousedown' && menuRef.current && !menuRef.current.contains(e.target)) setMenu(false);
    };
    document.addEventListener('keydown', onDoc); document.addEventListener('mousedown', onDoc);
    return () => { document.removeEventListener('keydown', onDoc); document.removeEventListener('mousedown', onDoc); };
  }, [drawing, drawCommand]);

  const listId = `${id}-list`;
  const optId = (i) => `${id}-opt-${i}`;
  let n = -1;
  return (
    <div className="searcharea">
      <div className="searchrow">
        <div className="searchbox">
          <span className="searchicon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M15.5 15.5 21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </span>
          <input ref={input} type="search" role="combobox" aria-label={S.label} aria-expanded={open && items.length > 0}
            aria-controls={listId} aria-autocomplete="list" aria-activedescendant={open && choosable.length ? optId(active) : undefined}
            placeholder={S.placeholder} value={shown} autoComplete="off" spellCheck="false"
            onFocus={() => { setEditing(true); setText(''); setOpen(true); setActive(0); }}
            onBlur={() => setTimeout(() => { setOpen(false); setEditing(false); setText(''); }, 150)}
            onChange={(e) => { setText(e.target.value); setOpen(true); setActive(0); }}
            onKeyDown={onKey} />
          {open && text.trim() && (
            <ul className="suggest" id={listId} role="listbox" aria-label={S.suggestions}>
              {items.length === 0 && <li className="suggest-empty" role="option" aria-disabled="true">{S.none(text.trim())}</li>}
              {items.map((it, i) => {
                if (it.kind === 'error') return <li key="err" className="suggest-error" role="option" aria-disabled="true">{it.label}</li>;
                n += 1; const k = n;
                return (
                  <li key={`${it.kind}-${it.id || i}`} id={optId(k)} role="option" aria-selected={k === active}
                    className={k === active ? 'on' : ''} onMouseDown={(e) => { e.preventDefault(); choose(it); }} onMouseEnter={() => setActive(k)}>
                    <span>{it.label}</span>{it.kind !== 'country' && <span className="suggest-kind">{S.kinds[it.kind]}</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <button type="button" className={drawing ? 'iconbtn on' : 'iconbtn'} aria-pressed={!!drawing}
          title={drawing ? S.drawStop : S.draw} aria-label={drawing ? S.drawStop : S.draw}
          onClick={() => { if (drawing) drawCommand('cancel'); else { setManual(null); setError(null); setDrawing('polygon'); } }}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 20l4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M13.5 7.5l3 3" stroke="currentColor" strokeWidth="1.8" /></svg>
        </button>
        <div className="choosemenu" ref={menuRef}>
          <button type="button" className="action ghost" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
            {S.chooseInstead} <span aria-hidden="true">▾</span>
          </button>
          {menu && (
            <div className="popmenu" role="menu">
              {['preset', 'country', 'box', 'point'].map((m) => (
                <button key={m} type="button" role="menuitemradio" aria-checked={manual === m}
                  onClick={() => { setManual(m); setMenu(false); if (drawing) drawCommand('cancel'); }}>{T.area.modes[m]}</button>
              ))}
            </div>
          )}
        </div>
      </div>
      <p className="small muted searchhelp">{S.help}</p>
      {drawing && (
        <div className="drawbar" role="group" aria-label={S.drawTools}>
          <span className="small">{draftCorners < 3 ? S.drawHint(draftCorners) : S.drawReady(draftCorners)}</span>
          <button type="button" className="action" disabled={draftCorners < 3} onClick={() => drawCommand('finish')}>{S.finish}</button>
          <button type="button" className="action ghost" disabled={!draftCorners} onClick={() => drawCommand('undo')}>{S.undo}</button>
          <button type="button" className="action ghost" onClick={() => drawCommand('cancel')}>{S.cancel}</button>
        </div>
      )}
      {manual && !drawing && (
        <div className="manualform">
          <AreaPicker area={area} setArea={(a) => { setArea(a); }} drawing={false} setDrawing={() => {}} setError={setError} only={manual} />
          <button type="button" className="linkbtn small" onClick={() => setManual(null)}>{S.closeForm}</button>
        </div>
      )}
    </div>
  );
}
