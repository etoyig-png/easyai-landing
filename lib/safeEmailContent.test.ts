import { describe, expect, it } from 'vitest';
import { renderUntrustedAssessmentContent } from './safeEmailContent';

describe('untrusted model email rendering', () => {
  it.each([
    '<script>alert(1)</script>', '<img src=x onerror=alert(1)>', '<a href="javascript:alert(1)">click</a>',
    '<a href="data:text/html,bad">click</a>', '<svg><script>alert(1)</script></svg>', '<div style="background:url(javascript:x)">x</div>',
    '&lt;img src=x onerror=alert(1)&gt;', '<scr<script>ipt>alert(1)</script>', '<p><b><i>nested</p>',
  ])('never preserves model-controlled markup: %s', (payload) => {
    const html = renderUntrustedAssessmentContent(payload);
    expect((html.match(/<[^>]+>/g) ?? []).every((tag) => /^<\/?p>$/.test(tag))).toBe(true);
  });
  it('keeps benign text in trusted paragraph tags', () => {
    expect(renderUntrustedAssessmentContent('<h2>Hello &amp; welcome</h2><p>A safe plan.</p>')).toBe('<p>Hello &amp;amp; welcome</p>\n<p>A safe plan.</p>');
  });
});
