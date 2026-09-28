// Built-in themes. Fonts are chosen to exist on macOS/Windows/Office by
// default so the PPTX renders identically without embedding: a theme that
// names an uninstalled family silently falls back to serif in previews.
//
// Arial, not Helvetica: Helvetica ships only on macOS (Windows PowerPoint
// substitutes Arial anyway), and macOS Helvetica.ttc loses its bold face in
// resvg previews as soon as a line contains a glyph like "→". Arial is
// metric-compatible and renders bold correctly everywhere.
export const THEMES = {
  carbon: {
    id: 'carbon', name: 'Carbon (blue accent, square corners)',
    colors: { background: '#ffffff', surface: '#f4f4f4', text: '#161616', muted: '#525252', accent: '#0f62fe', secondary: '#d0e2ff', border: '#8d8d8d' },
    fonts: { heading: 'Arial', body: 'Arial' }, radius: 0,
  },
  ink: {
    id: 'ink', name: 'Ink (dark slides, amber accent)',
    colors: { background: '#0f1115', surface: '#1a1d24', text: '#f3f4f6', muted: '#9aa0ab', accent: '#f5b942', secondary: '#2a2f3a', border: '#3a404d' },
    fonts: { heading: 'Arial', body: 'Arial' }, radius: 8,
  },
  paper: {
    id: 'paper', name: 'Paper (warm neutral, green accent)',
    colors: { background: '#fbf8f2', surface: '#f1ece1', text: '#1f1d19', muted: '#6b6459', accent: '#2e7d5b', secondary: '#dcebe2', border: '#c9c1b2' },
    fonts: { heading: 'Georgia', body: 'Arial' }, radius: 4,
  },
  slate: {
    id: 'slate', name: 'Slate (corporate navy)',
    colors: { background: '#ffffff', surface: '#eef2f7', text: '#0b1a33', muted: '#4b5b73', accent: '#1e4e9a', secondary: '#d6e2f5', border: '#b8c4d6' },
    fonts: { heading: 'Arial', body: 'Arial' }, radius: 2,
  },
};

export function resolveTheme(theme) {
  if (!theme) return THEMES.carbon;
  if (typeof theme === 'string') {
    const t = THEMES[theme];
    if (!t) throw new Error(`Unknown theme "${theme}". Known: ${Object.keys(THEMES).join(', ')}`);
    return t;
  }
  const base = THEMES[theme.extends ?? 'carbon'] ?? THEMES.carbon;
  return {
    id: theme.id ?? 'custom', name: theme.name ?? 'Custom',
    colors: { ...base.colors, ...(theme.colors ?? {}) },
    fonts: { ...base.fonts, ...(theme.fonts ?? {}) },
    radius: theme.radius ?? base.radius,
  };
}

/** `$token` -> theme colour; anything else passes through. */
export function resolveColor(value, theme, fallback = '#000000') {
  if (value == null) return fallback;
  const v = String(value);
  if (v.startsWith('$')) return theme.colors[v.slice(1)] ?? fallback;
  return v;
}

export function resolveFont(value, theme) {
  const v = value ?? '$body';
  if (typeof v === 'string' && v.startsWith('$')) return theme.fonts[v.slice(1)] ?? theme.fonts.body;
  return v;
}
