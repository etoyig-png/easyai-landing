import { escapeHtmlText } from './htmlEscape';

const ENTITY_PATTERN = /&(#(?:x[0-9a-f]+|[0-9]+)|colon|tab|newline);?/gi;

function decodeEntity(_match: string, entity: string): string {
  const lower = entity.toLowerCase();
  if (lower === 'colon') return ':';
  if (lower === 'tab') return '\t';
  if (lower === 'newline') return '\n';
  const value = lower.startsWith('#x') ? Number.parseInt(lower.slice(2), 16) : Number.parseInt(lower.slice(1), 10);
  return Number.isFinite(value) ? String.fromCodePoint(value) : '';
}

/** Treat model markup as untrusted input and render only escaped text in server-owned tags. */
export function renderUntrustedAssessmentContent(input: string): string {
  const withBreaks = input
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*\/\s*(?:p|h[1-6]|li|div)\s*>/gi, '\n\n');
  const text = withBreaks.replace(/<[^>]*>/g, '').replace(ENTITY_PATTERN, decodeEntity);
  const paragraphs = text.split(/\n\s*\n/).map((part) => part.replace(/\s+/g, ' ').trim()).filter(Boolean);
  return paragraphs.map((paragraph) => `<p>${escapeHtmlText(paragraph)}</p>`).join('\n');
}
