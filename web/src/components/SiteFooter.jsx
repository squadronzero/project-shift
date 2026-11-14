// The site footer (14 Nov): who made S.H.I.F.T, for which event, and where the code, the method and the data credits
// are. Plain text, no logos. It says the project is independent of NASA. On Explore it sits at the end of the
// analysis column, so it never covers the map; on the other pages it follows the page.
import T from '../content/text.js';

export const REPO_URL = 'https://github.com/squadronzero/project-shift';

export default function SiteFooter({ onNav }) {
  const F = T.footer;
  return (
    <footer className="sitefooter">
      <div className="sf-credit">
        <p className="sf-team">{F.credit}</p>
        <p className="sf-event">{F.event}</p>
      </div>
      <ul className="sf-links" aria-label={F.linksLabel}>
        <li><a href={REPO_URL} target="_blank" rel="noreferrer">{F.github}<span className="visually-hidden"> {F.newTab}</span></a></li>
        <li><button type="button" className="sf-link" onClick={() => onNav('method', 'overview')}>{F.method}</button></li>
        <li><button type="button" className="sf-link" onClick={() => onNav('method', 'sources')}>{F.credits}</button></li>
      </ul>
    </footer>
  );
}
