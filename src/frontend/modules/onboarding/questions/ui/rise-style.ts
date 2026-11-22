import type { CSSProperties } from "react";

/**
 * Staggers a screen's parts in: each gets the next `--i` (see `.ob-rise` in
 * globals.css, which caps the delay at 14). The style objects are made once,
 * so memoised options see the same object on every render.
 */
const RISE_STYLES = Array.from({ length: 15 }, (_, i) => ({ "--i": i }) as CSSProperties);

export const riseStyle = (i: number) => RISE_STYLES[Math.min(i, RISE_STYLES.length - 1)];
