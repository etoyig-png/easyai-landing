import { describe, expect, it } from 'vitest';
import { globeVector, projectGlobe, trailOpacity } from './trace-motion';

describe('light-trace visual contract', () => {
  it('retires every trail segment twenty-four seconds after its head passed', () => {
    expect(trailOpacity(0)).toBe(1);
    expect(trailOpacity(6000)).toBe(.75);
    expect(trailOpacity(12000)).toBe(.5);
    expect(trailOpacity(23999)).toBeGreaterThan(0);
    expect(trailOpacity(24000)).toBe(0);
    expect(trailOpacity(25000)).toBe(0);
    expect(trailOpacity(-10)).toBe(1);
  });
  it('rotates geographic surface points onto the front and hides the far hemisphere', () => {
    const point = globeVector(0,0);
    expect(projectGlobe(point,0).z).toBeGreaterThan(0);
    expect(projectGlobe(point,180).z).toBeLessThan(0);
    expect(projectGlobe(point,90).x).toBeCloseTo(545);
    expect(projectGlobe(point,270).x).toBeCloseTo(55);
    expect(Math.hypot(point.x,point.y,point.z)).toBeCloseTo(1);
  });
});
