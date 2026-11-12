// UI lab (14 Nov): the six design templates that can be compared in the lab preview.
// A template changes only the look, the layout and the navigation. Every number still comes from src/lib/.
// No template is on the live site. Without `t=` in the page address the site looks exactly like `main`.

export const TEMPLATES = [
  {
    id: 'atlas', code: 'T01', name: 'Earth Data Atlas', tag: 'Earth observation',
    nav: 'rail', prefers: 'light', globe: false, inspector: 'docked',
    blurb: 'Map first, a slim icon rail on the left and a docked research panel on the right. Daylight colours, clear attribution.',
  },
  {
    id: 'redline', code: 'T02', name: 'Redline / Industrial', tag: 'High contrast',
    nav: 'top', prefers: 'dark', globe: false, inspector: 'docked',
    blurb: 'Black, white and a restrained red for the interface only. Tools in a floating top toolbar, square corners, technical labels.',
  },
  {
    id: 'orbital', code: 'T03', name: 'Orbital Observatory', tag: 'Cinematic',
    nav: 'rail', prefers: 'dark', globe: true, inspector: 'floating',
    blurb: 'Opens on the 3D globe in deep navy. Icon rail on the left, a floating research panel that leaves the globe visible.',
  },
  {
    id: 'mission', code: 'T04', name: 'Mission Control', tag: 'Research first',
    nav: 'columns', prefers: 'dark', globe: false, inspector: 'docked',
    blurb: 'Three columns: labelled tools that open inside the left column, the map in the middle and the research panel on the right.',
  },
  {
    id: 'editorial', code: 'T05', name: 'Scientific Editorial', tag: 'Scientific minimal',
    nav: 'editorial', prefers: 'light', globe: false, inspector: 'split',
    blurb: 'Warm white, serif headings and an even map and reading split. On phones the page reads top to bottom like a report.',
  },
  {
    id: 'glass', code: 'T06', name: 'Glass Horizon', tag: 'Futuristic',
    nav: 'dock', prefers: 'dark', globe: true, inspector: 'floating',
    blurb: 'Full-screen globe, a floating tool dock at the bottom and translucent panels with a solid fallback for contrast.',
  },
];

export const templateById = (id) => TEMPLATES.find((t) => t.id === id) || null;

// Inline icons (24 x 24 strokes). No icon font, so the site still works offline.
export const ICONS = {
  globe: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18',
  pin: 'M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0ZM12 10h.01',
  layers: 'm12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5',
  calendar: 'M3 8h18M7 3v4M17 3v4M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
  chart: 'M3 3v18h18M7 16l4-6 3 3 5-7',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Zm-4-10 3 3 5-6',
  download: 'M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4',
  switch: 'M4 7h13l-3-3M20 17H7l3 3',
  book: 'M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4ZM20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7Z',
  check: 'M4 12l5 5L20 6',
  sliders: 'M4 7h16M4 17h16M8 4v6M16 14v6',
  close: 'M5 5l14 14M19 5 5 19',
  grid: 'M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z',
};
