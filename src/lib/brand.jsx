/* The brand: one name, one mark, one verse. */

export const APP_NAME = 'Numbered';
export const VERSE = 'So teach us to number our days that we may get a heart of wisdom.';
export const VERSE_REF = 'Psalm 90:12';

/**
 * The tally: four days struck by the fifth, and the strike rises.
 * Drawn on a 24-unit grid with a 2.2-unit minimum stroke so it holds at 16px.
 * `gold` is passed in so the mark can be re-coloured per surface.
 */
export function TallyMark({ size = 24, gold = 'var(--accent-mark)', title, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={title ? 'img' : 'presentation'}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : 'true'}
      focusable="false"
      {...rest}
    >
      <g stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none">
        <path d="M4.6 5.4 V18.6" />
        <path d="M9.5 5.4 V18.6" />
        <path d="M14.4 5.4 V18.6" />
        <path d="M19.3 5.4 V18.6" />
      </g>
      <path d="M2.8 17.4 L21.2 6.6" fill="none" stroke={gold} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

/** The same mark as a standalone file, for the favicon and the installed icon. */
export const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="512" height="512">
  <rect width="24" height="24" rx="5.4" fill="#0e2444"/>
  <g transform="translate(3.1 3.1) scale(0.742)">
    <g stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" fill="none">
      <path d="M4.6 5.4 V18.6"/><path d="M9.5 5.4 V18.6"/>
      <path d="M14.4 5.4 V18.6"/><path d="M19.3 5.4 V18.6"/>
    </g>
    <path d="M2.8 17.4 L21.2 6.6" fill="none" stroke="#e0b457" stroke-width="2.4" stroke-linecap="round"/>
  </g>
</svg>`;
