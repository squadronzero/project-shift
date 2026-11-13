// The Method page sections (redesign, 14 Nov 2026): introduction, the six steps, the satellite timeline and the
// feature gallery. Every explanation is in the page as text, so nothing depends on animation or hover.
import { useState } from 'react';
import { INTRO, STEPS, SENSORS, SEGMENT_KINDS, FEATURES } from './content.js';
import { DIAGRAMS } from './Diagrams.jsx';

export function MethodIntro() {
  const [stage, setStage] = useState(INTRO.stages[0].id);
  const s = INTRO.stages.find((x) => x.id === stage);
  return (
    <section id="overview" className="m-sec m-hero" aria-labelledby="m-overview">
      <h2 id="m-overview">{INTRO.title}</h2>
      <p className="m-lede">{INTRO.lede}</p>
      <ol className="m-flow" aria-label="From MODIS to one record">
        {INTRO.stages.map((x, i) => (
          <li key={x.id}>
            <button type="button" className={stage === x.id ? 'on' : ''} aria-pressed={stage === x.id} onClick={() => setStage(x.id)}>
              <span className="m-flow-n">{i + 1}</span><b>{x.label}</b><span>{x.sub}</span>
            </button>
          </li>
        ))}
      </ol>
      <p className="m-flow-text" aria-live="polite"><b>{s.label}.</b> {s.text}</p>
    </section>
  );
}

export function HarmonizationSteps() {
  const [i, setI] = useState(0);
  const [all, setAll] = useState(false);
  const one = (st, n) => {
    const D = DIAGRAMS[st.id];
    return (
      <article key={st.id} className="m-step" aria-labelledby={`m-step-${st.id}`}>
        <div className="m-step-text">
          <p className="m-step-n">Step {n + 1} of {STEPS.length}</p>
          <h4 id={`m-step-${st.id}`}>{st.title}</h4>
          <p className="m-step-short">{st.short}</p>
          <details className="define" open={all}>
            <summary>The detail</summary>
            <ul>{st.detail.map((d) => <li key={d.slice(0, 40)}>{d}</li>)}</ul>
          </details>
        </div>
        {D && <D />}
      </article>
    );
  };
  return (
    <section id="process" className="m-sec" aria-labelledby="m-process">
      <div className="m-sec-head">
        <h3 id="m-process">How it works, step by step</h3>
        <button type="button" className="linkbtn" aria-pressed={all} onClick={() => setAll((a) => !a)}>{all ? 'One step at a time' : 'Show all steps'}</button>
      </div>
      {all ? STEPS.map(one) : (
        <>
          <ol className="m-steps" aria-label="Steps">
            {STEPS.map((st, n) => (
              <li key={st.id}><button type="button" className={n === i ? 'on' : n < i ? 'done' : ''} aria-current={n === i ? 'step' : undefined}
                onClick={() => setI(n)}><span>{n + 1}</span><em>{st.title}</em></button></li>
            ))}
          </ol>
          <div className="m-step-wrap" key={STEPS[i].id}>{one(STEPS[i], i)}</div>
          <div className="m-step-nav">
            <button type="button" className="action ghost" disabled={i === 0} onClick={() => setI(i - 1)}>← Previous</button>
            <button type="button" className="action" disabled={i === STEPS.length - 1} onClick={() => setI(i + 1)}>Next: {STEPS[Math.min(i + 1, STEPS.length - 1)].title} →</button>
          </div>
        </>
      )}
    </section>
  );
}

const T0 = Date.UTC(2000, 0, 1), T1 = Date.UTC(2027, 0, 1);
const pct = (iso) => ((Date.parse(`${iso}T00:00:00Z`) - T0) / (T1 - T0)) * 100;
export function SensorTimeline() {
  const [sel, setSel] = useState('snpp');
  const s = SENSORS.find((x) => x.id === sel);
  return (
    <section id="satellites" className="m-sec" aria-labelledby="m-sat">
      <h3 id="m-sat">The satellites and their roles</h3>
      <p className="small">Bars show when each satellite feeds S.H.I.F.T, not its whole time in orbit. Choose one for its details.</p>
      <div className="m-tl" role="group" aria-label="Satellites">
        <div className="m-tl-axis" aria-hidden="true">{[2000, 2005, 2010, 2015, 2020, 2025].map((y) => <span key={y} style={{ left: `${pct(`${y}-01-01`)}%` }}>{y}</span>)}</div>
        {SENSORS.map((x) => (
          <button key={x.id} type="button" className={`m-tl-row ${sel === x.id ? 'on' : ''}`} aria-pressed={sel === x.id} onClick={() => setSel(x.id)}>
            <span className="m-tl-name">{x.name}<span className="visually-hidden">, {x.period}</span></span>
            <span className="m-tl-track">
              {x.segments.map(([a, b, k]) => <span key={a} className={`m-seg ${k}`} title={`${SEGMENT_KINDS[k]}: ${a} to ${b}`}
                style={{ left: `${pct(a)}%`, width: `${Math.max(0.6, pct(b) - pct(a))}%` }} />)}
            </span>
          </button>
        ))}
        <div className="m-tl-over" aria-hidden="true"><div className="m-tl-switch" style={{ left: `${pct('2012-01-20')}%` }} /></div>
      </div>
      <ul className="m-keyrow">{Object.entries(SEGMENT_KINDS).map(([k, l]) => <li key={k}><i className={`m-seg ${k}`} />{l}</li>)}</ul>
      <div className="m-sensor" aria-live="polite">
        <h4>{s.name}</h4>
        <dl>
          <dt>Data product</dt><dd>{s.product}</dd>
          <dt>Pixel size</dt><dd>{s.res}</dd>
          <dt>In S.H.I.F.T</dt><dd>{s.period}</dd>
          <dt>Role</dt><dd>{s.role}</dd>
          <dt>Keep in mind</dt><dd>{s.limits}</dd>
          <dt>Source</dt><dd><a href={s.link}>{s.link.replace('https://', '')}</a></dd>
        </dl>
      </div>
    </section>
  );
}

export function FeatureGallery({ onOpen }) {
  return (
    <section id="explore" className="m-sec" aria-labelledby="m-explore">
      <h3 id="m-explore">What you can explore</h3>
      <p className="small">Each picture is a screenshot of the live site, with the area and dates it shows.</p>
      <div className="m-cards">
        {FEATURES.map((f) => (
          <article key={f.id} className="m-card">
            <img src={f.img} alt={`Screenshot: ${f.title}, ${f.shot}`} loading="lazy" width="644" height="360" />
            <div className="m-card-body">
              <h4>{f.title}</h4>
              <p className="m-card-measure">{f.measures}</p>
              <details className="define"><summary>How it is worked out</summary><p>{f.what}</p></details>
              <p className="m-card-shot small">Screenshot: {f.shot}</p>
              <button type="button" className="action ghost" onClick={() => onOpen(f.open)}>Open in Explore →</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
