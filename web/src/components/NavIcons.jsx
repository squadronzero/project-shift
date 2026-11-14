// The four page icons of the top navigation (14 Nov). Drawn inline like the other icons on the site, no icon
// library. 24 × 24 grid, 1.8 stroke, round joins, so the four have the same size and visual weight.
const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };

export const NAV_ICONS = {
  // Explore: the Earth (globe with a meridian and two parallels)
  explore: <><circle cx="12" cy="12" r="8.5" {...P} /><path d="M12 3.5c-2.6 2.4-3.9 5.2-3.9 8.5s1.3 6.1 3.9 8.5c2.6-2.4 3.9-5.2 3.9-8.5S14.6 5.9 12 3.5z M3.8 9.3h16.4 M3.8 14.7h16.4" {...P} /></>,
  // The 2012 switch: a timeline with a marked switch point, one style before and one after
  switch: <><path d="M3 15.5h7 M14 15.5h7" {...P} /><path d="M3 12.5v6 M21 12.5v6" {...P} /><path d="M12 4.5v15" {...P} strokeDasharray="2.2 2.2" /><path d="M5.5 8.5h4 M14.5 8.5h4 M16.5 6.5l2 2-2 2" {...P} /></>,
  // Validation: a shield with a check mark
  validation: <><path d="M12 3.2 4.8 6v5.4c0 4.4 3 8 7.2 9.4 4.2-1.4 7.2-5 7.2-9.4V6L12 3.2z" {...P} /><path d="m8.6 12.2 2.4 2.4 4.6-4.8" {...P} /></>,
  // Method and data: an open book
  method: <><path d="M12 6.5C10.3 5.2 7.8 4.6 4 4.8v13.4c3.8-.2 6.3.4 8 1.7 1.7-1.3 4.2-1.9 8-1.7V4.8c-3.8-.2-6.3.4-8 1.7z M12 6.5v13.4" {...P} /></>,
};

export function NavIcon({ id }) {
  return <svg className="tab-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">{NAV_ICONS[id]}</svg>;
}
