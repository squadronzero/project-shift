// The research inspector of the fullscreen map (14 Nov): a side panel (a bottom sheet on phones) with the numbers
// the dashboard already shows for the selected area, and the existing cell or detection panel for what was chosen
// on the map. Nothing is recomputed here: the same cmp, lede and cell info as the story column, same wording.
import T, { fmtDay } from '../content/text.js';
import { fmt } from '../lib/format.js';
import { dateOf } from '../lib/data.js';
import CellPanel from './CellPanel.jsx';
import RecentPanel from './RecentPanel.jsx';

export default function FsInspector({ meta, area, cmp, variable, lede, loading, layerMode, pickInfo, onClosePick,
  rInfo, onCloseRecent, onHistory, onClose, onBack }) {
  const F = T.fullscreen;
  const tgt = cmp?.target;
  const from = tgt ? fmtDay(dateOf(meta, tgt.from)) : '', to = tgt ? fmtDay(dateOf(meta, tgt.to)) : '';
  return (
    <section className="fs-inspector" aria-label={F.inspector}>
      <header className="fs-ins-head">
        <h2>{F.inspector}</h2>
        <button type="button" className="mt-close" onClick={onClose} aria-label={F.closeInspector}>×</button>
      </header>
      <section className="fs-ins-area">
        {!area ? <p className="small muted">{F.noArea}</p> : <>
          <h3>{area.name}</h3>
          {loading && <p className="small muted">{T.loading}</p>}
          {!loading && tgt && <div className="facts compact">
            <p><b>{fmt(tgt.value, variable)}</b><span>{T.compare.window(from, to)}{variable === 'frp' ? ` · ${T.unitsLong.frp}` : ''}</span></p>
            <p><b>{T.compare.vsMedian(cmp.ratio)}</b><span>{T.compare.median(fmt(cmp.median, variable), cmp.baseline[0], cmp.baseline[1], cmp.baseCount)}</span></p>
            <p><b>{cmp.rank ? `#${cmp.rank}` : '–'}</b><span>{cmp.rank ? T.compare.rank(cmp.rank, cmp.of) : ''}</span></p>
          </div>}
          {!loading && lede && <p className="small">{lede}</p>}
          {!loading && tgt && <p className="small muted">{T.compare.modisShort}</p>}
          <p className="small muted">{area.kind === 'polygon' ? T.search.shapeNote : T.area.edgeNote}</p>
        </>}
      </section>
      <section className="fs-ins-pick">
        {layerMode === 'record'
          ? (pickInfo ? <CellPanel info={pickInfo} onClose={onClosePick} /> : <p className="small muted">{F.pickCell}</p>)
          : (rInfo ? <RecentPanel info={rInfo} onClose={onCloseRecent} onHistory={onHistory} /> : <p className="small muted">{F.pickRecent}</p>)}
      </section>
      <button type="button" className="action ghost fs-back" onClick={onBack}>{F.back}</button>
    </section>
  );
}
