import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('vendored Scroll-Craft distribution', () => {
  it('serves the exact reviewed engine and its license', () => {
    expect(readFileSync('public/scrollcraft/scrollcraft.js', 'utf8')).toBe(
      readFileSync('.agents/skills/scroll-craft/engine/scrollcraft.js', 'utf8'),
    );
    expect(readFileSync('public/scrollcraft/LICENSE', 'utf8')).toBe(
      readFileSync('.agents/skills/scroll-craft/LICENSE', 'utf8'),
    );
  });
});
