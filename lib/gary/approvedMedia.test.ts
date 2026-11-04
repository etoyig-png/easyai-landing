import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { expect, it } from 'vitest';

const video = readFileSync(path.resolve('public/gary/gary-approved.webm'));
const still = readFileSync(path.resolve('public/gary/gary-poses.webp'));
type Element = { id: number; start: number; end: number };
// Bounded EBML metadata reader for the fixed test asset; never handles visitor input.
function* elements(start = 0, limit = video.length): Generator<Element> {
  let offset = start;
  const width = (byte: number, max: number) => {
    for (let n = 1; n <= max; n++) if (byte & (0x80 >> (n - 1))) return n;
    throw new Error('Invalid EBML metadata');
  };
  while (offset < limit) {
    const idWidth = width(video[offset], 4), id = video.readUIntBE(offset, idWidth); offset += idWidth;
    const sizeWidth = width(video[offset], 8);
    let size = video[offset] & (0xff >> sizeWidth), unknown = size === (0xff >> sizeWidth);
    for (let i = 1; i < sizeWidth; i++) {
      unknown = unknown && video[offset + i] === 0xff; size = size * 256 + video[offset + i];
    }
    offset += sizeWidth;
    const end = unknown ? limit : offset + size;
    if (end > limit || end < offset) throw new Error('EBML element outside asset');
    yield { id, start: offset, end }; offset = end;
  }
}
function child(parent: Element | undefined, id: number): Element {
  for (const item of elements(parent?.start, parent?.end)) if (item.id === id) return item;
  throw new Error(`Missing approved metadata ${id.toString(16)}`);
}
const uint = (item: Element) => video.readUIntBE(item.start, item.end - item.start);
const segment = child(undefined, 0x18538067), info = child(segment, 0x1549a966), tracks = child(segment, 0x1654ae6b);
const entries = [...elements(tracks.start, tracks.end)].filter(e => e.id === 0xae);
const track = entries[0], geometry = child(track, 0xe0);

it('retains the exact approved moving character, including gesture and sign pixels', () => {
  expect(video.length).toBe(487848);
  expect(createHash('sha256').update(video).digest('hex')).toBe('7d688e315ce79cf3538d3bd196b38d9e65ff322474e0233a71ed9a5ce113f2e9');
});
it('retains the exact approved seated-sheet pixels', () => {
  expect(still.length).toBe(277914);
  expect(createHash('sha256').update(still).digest('hex')).toBe('9c2801b01450fc6ce475dc4c00a333756571d504ddd2c6439b8e922b6554cb69');
});
it('locks the actual media duration rather than an unused SVG timer schedule', () => {
  const duration = child(info, 0x4489);
  const units = duration.end - duration.start === 8 ? video.readDoubleBE(duration.start) : video.readFloatBE(duration.start);
  expect(units * uint(child(info, 0x2ad7b1)) / 1e9).toBe(20.125);
});
it('keeps a single silent VP9 video track without introducing audio', () => {
  expect(entries).toHaveLength(1); expect(uint(child(track, 0x83))).toBe(1);
  const codec = child(track, 0x86); expect(video.toString('utf8', codec.start, codec.end)).toBe('V_VP9');
});
it('keeps square native video frames for uncropped responsive playback', () => {
  expect(uint(child(geometry, 0xb0))).toBe(360); expect(uint(child(geometry, 0xba))).toBe(360);
});
it('maps the actual four-by-three sheet grid to the recovered 360px cell coordinates', () => {
  expect(still.toString('ascii', 0, 4)).toBe('RIFF'); expect(still.toString('ascii', 8, 16)).toBe('WEBPVP8X');
  const width = still.readUIntLE(24, 3) + 1, height = still.readUIntLE(27, 3) + 1;
  expect([width, height]).toEqual([1448, 1086]); expect(width / 4).toBe(height / 3);
  expect((width / 4) * 1440 / width).toBe(360); expect((height / 3) * 1080 / height).toBe(360);
});
it('preserves native transparency for the video and seated fallback', () => {
  expect(uint(child(geometry, 0x53c0))).toBe(1); expect(still[20] & 0x10).toBe(0x10);
});
