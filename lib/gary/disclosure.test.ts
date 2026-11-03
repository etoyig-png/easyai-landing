import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { GARY_OPENING_QUESTION, garyOpeningMessage } from './openingQuestion';
import { CONTACT_FLOW_PROMPTS, advanceContactFlow, withOpeningDisclosure } from './contactFlow';
import { getSiteConfig } from '@/lib/siteConfig';

/**
 * The visitor must be told they are talking to an artificial-intelligence assistant before
 * anything else happens — in a normal conversation AND when a contact button opens Gary
 * straight into the four-step flow — and always before any personal information is asked for.
 */
const DISCLOSURE = getSiteConfig().assistant.disclosure;

describe('AI disclosure', () => {
  it('is unmistakable and names the assistant and the brand by default', () => {
    expect(DISCLOSURE).toBe("Hi, I'm Gary, Easy AI's AI assistant.");
    expect(DISCLOSURE).toMatch(/\bAI assistant\b/);
  });

  it('opens every normal conversation, before the fixed opening question', () => {
    const opening = garyOpeningMessage(DISCLOSURE);
    expect(opening.startsWith(DISCLOSURE)).toBe(true);
    expect(opening.endsWith(GARY_OPENING_QUESTION)).toBe(true);
    expect(opening.indexOf('AI assistant')).toBeLessThan(opening.indexOf(GARY_OPENING_QUESTION));
  });

  it('opens the contact flow when it is entered directly, before the name is asked for', () => {
    const start = withOpeningDisclosure(advanceContactFlow({ action: 'start' }), DISCLOSURE);
    expect(start.text).toBe(`${DISCLOSURE} ${CONTACT_FLOW_PROMPTS.name}`);
    expect(start.draft).toEqual({ step: 'name' });
    expect(start.freeText).toBe(true);
    expect(start.placeholder).toBe('Your name');
  });

  it('adds no step: the disclosure is wording on step one, and later steps are untouched', () => {
    const afterName = advanceContactFlow({ action: 'answer', draft: { step: 'name' }, text: 'Dana' });
    expect(afterName.text).toBe(CONTACT_FLOW_PROMPTS.contact);
    expect(afterName.text).not.toContain('AI assistant');
  });

  it('uses no em dash, like every other Gary line', () => {
    expect(garyOpeningMessage(DISCLOSURE)).not.toMatch(/[–—]/);
  });

  it('is applied by the message route at both entry points', () => {
    const route = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'api', 'gary', 'message', 'route.ts'), 'utf8');
    expect(route).toContain('garyOpeningMessage(site.assistant.disclosure)');
    expect(route).toContain("flowRequest.action === 'start' ? withOpeningDisclosure(advanced, site.assistant.disclosure)");
    expect(route).not.toMatch(/content:\s*GARY_OPENING_QUESTION\b/);
  });
});
