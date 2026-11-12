// UI lab (14 Nov): the HUD, a row or rail of tool icons with drawers.
// Behaviour (V2 spec 5.2): pointer hover previews a drawer, leaving the icon and the drawer closes the preview,
// a click, tap, Enter or Space pins it, the same icon again closes it, another icon replaces it, Escape closes it
// and returns focus to its icon. Touch never depends on hover. Closing a drawer never resets the area, dates or map.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import T from '../content/text.js';
import { ICONS } from './templates.js';

const Hud = createContext(null);
export const useHud = () => useContext(Hud);

export function Icon({ name, size = 20 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={ICONS[name] || ICONS.grid} /></svg>
  );
}

export function HudProvider({ children }) {
  const [open, setOpen] = useState(null);       // id of the open drawer
  const [pinned, setPinned] = useState(false);  // pinned by click/tap/keyboard, or only a hover preview
  const [slots, setSlots] = useState({ tools: null, drawer: null });
  const timer = useRef(null);
  const clear = () => { clearTimeout(timer.current); timer.current = null; };
  const close = useCallback((focusBack = false) => {
    clear();
    setOpen((id) => {
      if (focusBack && id) setTimeout(() => document.querySelector(`[data-hud="${id}"]`)?.focus(), 0);
      return null;
    });
    setPinned(false);
  }, []);
  const api = {
    open, pinned, slots, setSlots,
    preview: (id) => { clear(); timer.current = setTimeout(() => { setOpen((cur) => (cur && pinned ? cur : id)); }, 180); },
    leave: () => { if (pinned) return; clear(); timer.current = setTimeout(() => { setOpen(null); }, 260); },
    stay: clear,
    toggle: (id) => { clear(); if (open === id && pinned) { setOpen(null); setPinned(false); } else { setOpen(id); setPinned(true); } },
    close,
  };
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && open) close(true); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);
  useEffect(() => clear, []);
  return <Hud.Provider value={api}>{children}</Hud.Provider>;
}

// One icon. `drawer` true: it opens a drawer with the same id. Otherwise `onSelect` runs (a page or a panel toggle).
export function HudButton({ id, icon, label, drawer = false, onSelect, active = false }) {
  const h = useHud();
  const isOpen = drawer && h.open === id;
  return (
    <button type="button" className={`hud-btn${isOpen || active ? ' on' : ''}`} data-hud={id} aria-label={label}
      aria-expanded={drawer ? isOpen : undefined} aria-controls={drawer ? `hud-drawer-${id}` : undefined}
      aria-pressed={!drawer && active ? true : undefined}
      onPointerEnter={(e) => { if (drawer && e.pointerType === 'mouse') h.preview(id); }}
      onPointerLeave={(e) => { if (drawer && e.pointerType === 'mouse') h.leave(); }}
      onClick={() => { if (drawer) h.toggle(id); else { h.close(); onSelect?.(); } }}>
      <Icon name={icon} />
      <span className="hud-label">{label}</span>
    </button>
  );
}

// The drawer of one tool, drawn into the drawer slot so every template can place it differently.
export function HudDrawer({ id, title, children }) {
  const h = useHud();
  if (h.open !== id || !h.slots.drawer) return null;
  return createPortal(
    <section id={`hud-drawer-${id}`} className={`hud-drawer${h.pinned ? ' pinned' : ''}`} aria-label={title}
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') h.stay(); }}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') h.leave(); }}>
      <header className="hud-drawer-head">
        <h2>{title}</h2>
        <button type="button" className="hud-close" onClick={() => h.close(true)} aria-label={`${T.lab.close}: ${title}`}><Icon name="close" size={16} /></button>
      </header>
      <div className="hud-drawer-body">{children}</div>
    </section>, h.slots.drawer);
}

// Tools that belong to a page (Explore) are drawn into the rail from that page.
export function HudTools({ children }) {
  const h = useHud();
  return h?.slots.tools ? createPortal(children, h.slots.tools) : null;
}
