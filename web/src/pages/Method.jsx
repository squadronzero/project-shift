// Method and data (redesigned 14 Nov 2026): how the record is built, the satellites, what Explore shows, the
// limits and every source. The words and facts live in pages/method/content.js and pages/method/Limits.jsx;
// nothing here computes a value.
import { useEffect, useState } from 'react';
import T, { fmtDay } from '../content/text.js';
import { dateOf, lastDataDay } from '../lib/data.js';
import { SECTIONS } from './method/content.js';
import { FeatureGallery, HarmonizationSteps, MethodIntro, SensorTimeline } from './method/Sections.jsx';
import { ScientificLimits, SourceLibrary } from './method/Limits.jsx';

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// A narrow rail of section links on wide screens, one dropdown on tablets and phones. Highlights the section in view.
function SectionNav() {
  const [active, setActive] = useState(SECTIONS[0][0]);
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver((es) => {
      const vis = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (vis[0]) setActive(vis[0].target.id);
    }, { rootMargin: '-15% 0px -70% 0px' });
    SECTIONS.forEach(([id]) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);
  const go = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
    el.querySelector('h2, h3')?.setAttribute('tabindex', '-1');
    el.querySelector('h2, h3')?.focus({ preventScroll: true });
    setActive(id);
  };
  return (
    <nav className="m-nav" aria-label="Sections of this page">
      <ul>{SECTIONS.map(([id, l]) => <li key={id}><button type="button" className={active === id ? 'on' : ''} aria-current={active === id ? 'true' : undefined}
        onClick={() => go(id)}>{l}</button></li>)}</ul>
      <label className="m-nav-pick">Jump to
        <select value={active} onChange={(e) => go(e.target.value)}>{SECTIONS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select>
      </label>
    </nav>
  );
}

export default function Method({ meta, onOpen = () => {} }) {
  const last = meta ? fmtDay(dateOf(meta, lastDataDay(meta))) : null;
  return (
    <main className="page method">
      <SectionNav />
      <div className="m-main">
        <MethodIntro />
        <HarmonizationSteps />
        <SensorTimeline />
        <FeatureGallery onOpen={onOpen} />
        <ScientificLimits last={last} />
        <SourceLibrary meta={meta} />
        <p className="small">{T.notOfficial}.</p>
      </div>
    </main>
  );
}
