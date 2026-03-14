/**
 * Shared terminal theme — color palette, symbols, and layout helpers.
 * Matches the @clack/prompts visual language (dim gutter bar, cyan accent).
 */

import pc from 'picocolors';

// ─── Color Palette ───────────────────────────────────────────────────────────

export const header = (s: string) => pc.bold(pc.cyan(s));
export const label = (s: string) => pc.dim(s);
export const dim = (s: string) => pc.dim(s);
export const accent = (s: string) => pc.cyan(s);
export const success = (s: string) => pc.green(s);
export const warn = (s: string) => pc.yellow(s);
export const error = (s: string) => pc.red(s);
export const bold = (s: string) => pc.bold(s);

// ─── Symbols ─────────────────────────────────────────────────────────────────

export const S = {
  BULLET: '●',
  BULLET_OPEN: '○',
  ARROW: '▸',
  BAR: '│',
  CORNER_TOP: '┌',
  CORNER_BOT: '└',
  DASH: '─',
  CHECK: '✓',
  CROSS: '✗',
  DOT: '·',
  BLOCK_FULL: '█',
  BLOCK_EMPTY: '░',
} as const;

// ─── ANSI Utilities ──────────────────────────────────────────────────────────

/** Strip ANSI escape sequences for accurate string length measurement. */
// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[[0-9;]*m/g;

export function stripAnsi(s: string): number {
  return s.replace(ANSI_RE, '').length;
}

/** Pad string to width, accounting for ANSI escape sequences. */
export function padRight(s: string, width: number): string {
  const visible = stripAnsi(s);
  return visible >= width ? s : s + ' '.repeat(width - visible);
}

// ─── Layout Helpers ──────────────────────────────────────────────────────────

export function divider(width = 35): string {
  return dim(S.DASH.repeat(width));
}

/** Energy bar visualization: ████░ */
export function energyBar(level: number, max = 5): string {
  const filled = Math.max(0, Math.min(max, level));
  return success(S.BLOCK_FULL.repeat(filled)) + dim(S.BLOCK_EMPTY.repeat(max - filled));
}

// ─── Box Helpers (gutter-bar style) ──────────────────────────────────────────

export function boxStart(title: string): string {
  return `${dim(S.CORNER_TOP)}  ${header(title)}`;
}

export function boxLine(content = ''): string {
  return content ? `${dim(S.BAR)}  ${content}` : dim(S.BAR);
}

export function boxEnd(): string {
  return dim(S.CORNER_BOT);
}

/** Build a complete box from title and content lines. */
export function box(title: string, lines: (string | null)[]): string {
  const out: string[] = [boxStart(title), boxLine()];
  for (const line of lines) {
    if (line === null) {
      out.push(boxLine());
    } else {
      out.push(boxLine(line));
    }
  }
  out.push(boxLine(), boxEnd());
  return out.join('\n');
}
