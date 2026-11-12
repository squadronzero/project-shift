// UI lab (14 Nov): the gallery of the six designs, plus the current site as the control.
import T from '../content/text.js';
import { TEMPLATES } from './templates.js';

function Mini({ id }) {
  // a small schematic of the layout (not a screenshot): where the tools, the map and the research panel sit
  return (
    <div className={`mini-layout mini-${id}`} aria-hidden="true">
      <span className="m-nav" /><span className="m-map" /><span className="m-panel" />
    </div>
  );
}

export default function Gallery({ onPick, onCurrent }) {
  return (
    <main className="page lab-gallery" id="results" tabIndex={-1}>
      <p className="lab-eyebrow">{T.brand} · UI lab</p>
      <h2>{T.lab.galleryTitle}</h2>
      <p className="lede">{T.lab.galleryLede}</p>
      <ul className="lab-cards">
        {TEMPLATES.map((t) => (
          <li key={t.id} className="lab-card">
            <Mini id={t.id} />
            <p className="lab-code">{`${t.code} · ${t.tag}`}</p>
            <h3>{t.name}</h3>
            <p className="small">{t.blurb}</p>
            <button type="button" className="action" onClick={() => onPick(t.id)}>{T.lab.open(t.name)}</button>
          </li>
        ))}
        <li className="lab-card control">
          <Mini id="site" />
          <p className="lab-code">Control</p>
          <h3>{T.lab.current}</h3>
          <p className="small">{T.lab.currentBlurb}</p>
          <button type="button" className="action ghost" onClick={onCurrent}>{T.lab.open(T.lab.current.toLowerCase())}</button>
        </li>
      </ul>
      <p className="small">{T.lab.real}</p>
      <p className="notice">{T.lab.notYet}</p>
    </main>
  );
}
