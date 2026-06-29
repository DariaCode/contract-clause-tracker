/** Small presentation helpers shared across the feature screens. */
import { DocumentSummary } from './models';

/** Colours assigned to user-created labels, in rotation. */
export const CUSTOM_PALETTE = ['#9333ea', '#0d9488', '#dc2626', '#2563eb', '#65a30d', '#db2777'];

/** Full label colour palette offered as swatches on the management page. */
// prettier-ignore
export const LABEL_PALETTE = [
  '#1d4ed8', '#0e7490', '#b45309', '#6d28d9', '#047857', '#475569', '#be185d', '#ca8a04',
  '#0891b2', '#4d7c0f', '#9333ea', '#0d9488', '#dc2626', '#2563eb', '#db2777', '#16a34a',
];

/** A clause colour at 10% opacity — the sentence/chip tint. */
export function tint(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, 0.1)`;
}

/** Uppercase file-extension badge, e.g. "TXT" / "MD". */
export function extBadge(doc: { filename: string; content_type: string }): string {
  const ext = doc.filename.split('.').pop()?.toUpperCase() ?? '';
  if (ext === 'MARKDOWN') return 'MD';
  if (ext) return ext;
  return doc.content_type === 'markdown' ? 'MD' : 'TXT';
}

/** Compact date like "Jun 24". */
export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/** The next colour for a newly-created clause type. */
export function nextCustomColor(customCount: number): string {
  return CUSTOM_PALETTE[customCount % CUSTOM_PALETTE.length];
}

/** Most recent `created_at` across a set of documents, as a short date. */
export function lastSeen(docs: DocumentSummary[]): string {
  if (!docs.length) return '—';
  const latest = docs.reduce((a, b) => (a.created_at > b.created_at ? a : b));
  return shortDate(latest.created_at);
}
