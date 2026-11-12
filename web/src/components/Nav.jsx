// Navigation between the four views. One component, so a lab template can swap it (UI lab shell, 13 Nov).
// This is the live site's tab row, unchanged in look and behaviour.
import T from '../content/text.js';

export default function Nav({ views, current, setCurrent }) {
  return (
    <nav aria-label="Views">
      {views.map((id) => (
        <button key={id} className={current === id ? 'tab on' : 'tab'} aria-current={current === id ? 'page' : undefined}
          onClick={() => setCurrent(id)}>{T.views[id]}</button>
      ))}
    </nav>
  );
}
