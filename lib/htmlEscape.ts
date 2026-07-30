/** Full escape (safe for attribute values too). */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Minimal escape for plain HTML text nodes (not attributes). Quotes are left
 * as literal characters — quote-escaping is unnecessary outside of attribute
 * values and, more importantly, entity-encoding a name like "Bob's Plumbing"
 * would make it read as "Bob&#39;s Plumbing" to a naive string comparison
 * against naturally-written prose (e.g. Claude's own output), which never
 * entity-encodes an apostrophe it writes in body text. `&`, `<`, `>` are the
 * only characters that can break or inject markup inside a text node.
 */
export function escapeHtmlText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
