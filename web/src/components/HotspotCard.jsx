// "What is a hotspot?" (14 Nov): a native <details> styled as a card, so Enter, Space, the open state for screen readers
// and the click target (the whole header) all come from the browser. The text lives in content/text.js (T.hotspot);
// the drawing is a schematic and says so.
import { useState } from 'react';
import T from '../content/text.js';

function HotspotDiagram() {
  // three panels: detections → 0.05° cells → cell-days. A made-up 3 × 3 patch of cells, 28 px each; detection positions
  // are in the patch's own coordinates. A cell is active when at least one detection falls inside it.
  const S = 28;
  const dets = [[8, 8], [16, 18], [21, 10], [11, 21], [40, 12], [64, 40], [72, 48], [44, 64]];
  const cells = [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => ({ c, r, on: dets.some(([x, y]) => Math.floor(x / S) === c && Math.floor(y / S) === r) })));
  const n = cells.filter((k) => k.on).length;
  const patch = (ox, showDets, showOn) => (
    <g transform={`translate(${ox} 10)`}>
      {cells.map((k) => <rect key={`${k.c}${k.r}`} x={k.c * S} y={k.r * S} width={S} height={S} className={showOn && k.on ? 'hs-cell on' : 'hs-cell'} />)}
      {showDets && dets.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" className="hs-det" />)}
    </g>
  );
  return (
    <figure className="hs-fig">
      <svg viewBox="0 0 400 118" role="img" aria-label={`Illustration: ${dets.length} detections fall into ${n} grid cells, which count as ${n} hotspot cell-days`}>
        {patch(8, true, false)}
        <text x="50" y="112" textAnchor="middle" className="hs-t">{dets.length} detections</text>
        <path d="M108 52h28m-6-5 6 5-6 5" className="hs-arrow" />
        {patch(150, true, true)}
        <text x="192" y="112" textAnchor="middle" className="hs-t">0.05° cells</text>
        <path d="M250 52h28m-6-5 6 5-6 5" className="hs-arrow" />
        <text x="336" y="58" textAnchor="middle" className="hs-n">{n}</text>
        <text x="336" y="80" textAnchor="middle" className="hs-t">hotspot cell-days</text>
        <text x="336" y="112" textAnchor="middle" className="hs-t">for that day</text>
      </svg>
      <figcaption>{T.hotspot.diagram}</figcaption>
    </figure>
  );
}

export default function HotspotCard() {
  const H = T.hotspot;
  const [open, setOpen] = useState(false);
  return (
    <details className="hs-card" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>
        <span className="hs-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M9.6 9.4a2.5 2.5 0 1 1 3.6 2.3c-.8.4-1.2.9-1.2 1.8v.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="12" cy="17" r="1.1" fill="currentColor" /></svg>
        </span>
        <span className="hs-head">
          <span className="hs-title">{T.whatIsHotspot}</span>
          <span className="hs-sub">{open ? H.subOpen : H.subClosed}</span>
        </span>
        <span className="hs-action" aria-hidden="true">{open ? H.less : H.more}
          <svg className="hs-chev" viewBox="0 0 24 24" width="16" height="16"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
      </summary>
      <div className="hs-body">
        {H.parts.map(([q, a]) => <section key={q}><p className="hs-q">{q}</p><p>{a}</p></section>)}
        <HotspotDiagram />
        <p className="hs-limit">{H.limit}</p>
      </div>
    </details>
  );
}
