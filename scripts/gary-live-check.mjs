// Weekly live check of Gary on the real website. One short conversation (9 replies) through the
// public chat API, then the real Start Your Journey handoff. Fails (non-zero exit) if:
//   - the button flag is not on exactly the scheduled replies (4 and 9) plus the direct link request,
//   - Gary claims he cannot send links,
//   - or the handoff does not return a working /assessment link.
// It never opens or submits the assessment and sends no contact details. Test sessions use the
// "gary-weekly-check-" anonymous id so reports can exclude them.
// Usage: node scripts/gary-live-check.mjs [https://www.easyaiconsult.com]

const BASE = (process.argv[2] || process.env.GARY_CHECK_URL || 'https://www.easyaiconsult.com').replace(/\/$/, '');
const anonymousId = `gary-weekly-check-${Date.now()}`;
const MESSAGES = [
  'I run a plumbing company and we miss calls after 5pm.', // 1
  'Mostly emergency jobs.', // 2
  'ok', // 3
  'Would an answering service sound robotic?', // 4 scheduled
  'We have six trucks.', // 5
  'Can you send me the link to the assessment?', // 6 direct request
  'thanks', // 7
  'What would you check first?', // 8
  'Who do you think wins the Super Bowl this year?', // 9 scheduled, off-topic
];
const EXPECTED_BUTTON = [4, 6, 9];

async function post(path, body) {
  const response = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'gary-weekly-check' },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let data = null;
  try { data = JSON.parse(text); } catch { /* keep raw text for the error */ }
  if (!response.ok) throw new Error(`${path} returned ${response.status}: ${text.slice(0, 200)}`);
  return data;
}

const failures = [];
const opening = await post('/api/gary/message', { anonymousId, currentPage: '/' });
const { sessionId } = opening;
let capability = opening.sessionCapability;
const seen = [];

for (const [index, message] of MESSAGES.entries()) {
  const reply = index + 1;
  const data = await post('/api/gary/message', { anonymousId, currentPage: '/', sessionId, sessionCapability: capability, message });
  if (data.sessionCapability) capability = data.sessionCapability;
  if (data.offerAssessment) seen.push(reply);
  if (/can(?:no|')?t (?:send|share) (?:you )?(?:a |the )?links?/i.test(data.reply.text)) failures.push(`reply ${reply}: Gary said he cannot send links`);
  console.log(`reply ${reply}${data.offerAssessment ? ' [BUTTON]' : ''}: ${data.reply.text.replace(/\s+/g, ' ').slice(0, 140)}`);
}
if (JSON.stringify(seen) !== JSON.stringify(EXPECTED_BUTTON)) failures.push(`button on replies ${JSON.stringify(seen)}, expected ${JSON.stringify(EXPECTED_BUTTON)}`);

try {
  const handoff = await post('/api/gary/handoff', { sessionId, sessionCapability: capability });
  const url = new URL(handoff.redirectUrl, BASE);
  if (url.pathname !== '/assessment') failures.push(`handoff pointed to ${url.pathname}, expected /assessment`);
  const page = await fetch(url, { headers: { 'User-Agent': 'gary-weekly-check' } });
  if (!page.ok) failures.push(`assessment page returned ${page.status}`);
  else console.log('handoff: /assessment link works');
} catch (error) {
  failures.push(`handoff failed: ${error.message}`);
}

if (failures.length) {
  console.error('\nGARY LIVE CHECK FAILED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('\nGARY LIVE CHECK PASSED: button on replies 4, 6 (link request) and 9; handoff opens /assessment.');
