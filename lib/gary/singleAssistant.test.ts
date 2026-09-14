import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

/**
 * Structural guard for the locked product decision: one Gary, one contact workflow, one
 * Command Center handoff. These read the repository rather than running it, so a second
 * assistant, a second contact pipeline, or a second outbox writer fails the build before a
 * reviewer has to notice it.
 */
const repoRoot = path.resolve(__dirname, '..', '..');

function read(rel: string): string {
  return fs.readFileSync(path.join(repoRoot, rel), 'utf8');
}

function collect(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(path.join(repoRoot, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) collect(rel, out);
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) out.push(rel);
  }
  return out;
}

const activeFiles = ['app', 'lib', 'components'].flatMap((dir) => collect(dir));

describe('one Gary', () => {
  it('mounts the launcher exactly once, in the root layout', () => {
    const mounts = activeFiles.filter((rel) => /<GaryLauncher\b/.test(read(rel)));
    expect(mounts).toEqual(['app/layout.tsx']);
  });

  it('renders the chat panel only from that launcher', () => {
    const renderers = activeFiles.filter((rel) => /<GaryPanel\b/.test(read(rel)));
    expect(renderers).toEqual(['components/gary/GaryLauncher.tsx']);
  });

  it('opens Gary from page content only through the shared event, never by mounting another instance', () => {
    const pageOpeners = activeFiles.filter((rel) => rel.startsWith('app/') && /openGary\(/.test(read(rel)));
    expect(pageOpeners).toEqual([]);
    expect(read('components/TalkToGaryButton.tsx')).toContain("openGary('contact')");
  });
});

describe('one contact workflow and one handoff', () => {
  it('has a single contact-flow script and a single submission pipeline', () => {
    const flows = activeFiles.filter((rel) => /export function advanceContactFlow\b/.test(read(rel)));
    const pipelines = activeFiles.filter((rel) => /export async function submitAssistantContact\b/.test(read(rel)));
    expect(flows).toEqual(['lib/gary/contactFlow.ts']);
    expect(pipelines).toEqual(['lib/gary/contactSubmission.ts']);
  });

  it('records contact.captured only through the funnel outbox, with producer-scoped keys', () => {
    // Two producers exist: the pre-existing assessment handoff (conversation summary) and the
    // contact pipeline. They must never share an idempotency key, or one silently drops.
    const writers = activeFiles.filter((rel) => /eventType:\s*'contact\.captured'/.test(read(rel))).sort();
    expect(writers).toEqual(['app/api/gary/handoff/route.ts', 'lib/gary/contactSubmission.ts']);
    expect(read('app/api/gary/handoff/route.ts')).toContain('idempotencyKey: `contact.captured:${session.id}`');
    expect(read('lib/gary/contactSubmission.ts')).toContain('idempotencyKey: `contact.captured:${sessionId}:${config.contact.channelKey}`');
    expect(read('lib/gary/contactSubmission.ts')).toContain('recordFunnelEvent(tx, event)');
  });

  it('does not write the inactive CRR outbox from the contact pipeline', () => {
    // CrrOutboxEvent has no consumer in the repository. The pre-existing writer in the
    // assessment handoff route is left as it was; the contact pipeline must not add a second.
    expect(read('lib/gary/contactSubmission.ts')).not.toMatch(/crrOutboxEvent/);
    const writers = activeFiles.filter((rel) => /crrOutboxEvent\.create/.test(read(rel)));
    expect(writers).toEqual(['app/api/gary/handoff/route.ts']);
  });

  it('keeps the four steps and their wording', () => {
    const flow = read('lib/gary/contactFlow.ts');
    expect(flow).toContain(`name: "What's your name?"`);
    expect(flow).toContain(`contact: "What's the best way to reach you: email, phone, or both?"`);
    expect(flow).toContain(`reason: 'What can we help you with?'`);
    expect(flow).toContain(`confirm: 'Does everything look right?'`);
    expect(flow).toContain(`CONTACT_CONFIRM_YES = 'Yes, send it'`);
    expect(flow).toContain(`CONTACT_CONFIRM_CHANGE = 'Make a change'`);
  });
});
