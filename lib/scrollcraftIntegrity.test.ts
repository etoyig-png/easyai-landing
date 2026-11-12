import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

// The approved 1.1 runtime has a reviewed scroll-region adapter. Pin both that exact
// served runtime and the untouched upstream source; retain the original license guard.
const sha = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
describe('vendored Scroll-Craft distribution', () => {
  it('serves the approved scroll-region adapter and preserves upstream source/license', () => {
    expect(sha('.agents/skills/scroll-craft/engine/scrollcraft.js')).toBe('4a419b3ede51f64790af7b56c0195ea01c98a84df8e0e768ebf343956b922f39');
    expect(sha('public/scrollcraft/scrollcraft.js')).toBe('bed39c13d1095dc60e16067e7e968a8c84a6deb20edff48fbc95252acc453885');
    expect(readFileSync('public/scrollcraft/LICENSE', 'utf8')).toBe(readFileSync('.agents/skills/scroll-craft/LICENSE', 'utf8'));
  });
});
