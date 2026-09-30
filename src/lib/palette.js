/* Categorical palette for focus categories.
 *
 * Each swatch ships a light-surface step and a dark-surface step -- dark mode is
 * *selected*, not an automatic flip. The first five slots are the defaults and
 * were validated as an ordered set with the dataviz palette validator:
 *
 *   light (surface #ffffff): band PASS · chroma PASS · CVD adjacent worst 8.8
 *                            · normal-vision worst 18.6 · contrast all >= 3:1
 *   dark  (surface #111c31): band PASS · chroma PASS · CVD adjacent worst 10.7
 *                            · normal-vision worst 16.4 · contrast all >= 3:1
 *
 * Slots are assigned in fixed order and follow the category (never its rank),
 * so filtering or reordering never repaints a series.
 */

export const SWATCHES = [
  { id: 'blue', name: 'Blue', light: '#3D74D0', dark: '#4E8BDE' },
  { id: 'amber', name: 'Amber', light: '#C96A2A', dark: '#C7792F' },
  { id: 'teal', name: 'Teal', light: '#188B72', dark: '#1FA684' },
  { id: 'violet', name: 'Violet', light: '#8368D8', dark: '#8878DE' },
  { id: 'rose', name: 'Rose', light: '#D45E86', dark: '#D26892' },
  { id: 'slate', name: 'Slate', light: '#5B6B85', dark: '#8496B3' },
  { id: 'olive', name: 'Olive', light: '#6F7D22', dark: '#94A53B' },
  { id: 'plum', name: 'Plum', light: '#9B4F94', dark: '#B667AE' },
];

export const DEFAULT_SWATCH_ORDER = ['blue', 'amber', 'teal', 'violet', 'rose', 'slate', 'olive', 'plum'];

export function swatchById(id) {
  return SWATCHES.find((s) => s.id === id) || SWATCHES[0];
}

/** Resolve a category's mark color for the active theme. */
export function catColor(category, isDark) {
  const s = swatchById(category && category.swatch);
  return isDark ? s.dark : s.light;
}

/** Next unused swatch id, in fixed slot order. */
export function nextSwatch(used) {
  const taken = new Set(used);
  return DEFAULT_SWATCH_ORDER.find((id) => !taken.has(id)) || 'slate';
}
