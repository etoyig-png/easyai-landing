import { describe, expect, it } from 'vitest';
import { escapeHtml, escapeHtmlText } from './htmlEscape';

describe('escapeHtml', () => {
  it('escapes all HTML-significant characters including quotes', () => {
    expect(escapeHtml(`<script>alert("x")</script> & Bob's`)).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; Bob&#39;s'
    );
  });
});

describe('escapeHtmlText', () => {
  it('escapes markup-breaking characters but leaves quotes/apostrophes literal', () => {
    expect(escapeHtmlText(`<script>alert("x")</script> & Bob's Plumbing`)).toBe(
      '&lt;script&gt;alert("x")&lt;/script&gt; &amp; Bob\'s Plumbing'
    );
  });

  it('leaves ordinary business names untouched', () => {
    expect(escapeHtmlText('Johnson Electric')).toBe('Johnson Electric');
  });
});
