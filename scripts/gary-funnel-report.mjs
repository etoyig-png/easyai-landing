// Gary funnel report: how many chats see the Start Your Journey button, click it, reach the
// assessment and finish it. Read-only counts from existing tables; prints no names, emails,
// messages or IP addresses. Excludes the weekly live check's test sessions.
// Usage: DATABASE_URL=... node scripts/gary-funnel-report.mjs [days=30]
import { PrismaClient } from '@prisma/client';

const days = Number(process.argv[2] || 30);
const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const prisma = new PrismaClient();
const real = { startedAt: { gte: since }, NOT: { anonymousId: { startsWith: 'gary-weekly-check-' } } };

try {
  const [opened, chatted, reached4, reached9, offered, clicked, reachedAssessment, finished] = await Promise.all([
    prisma.publicChatSession.count({ where: real }),
    prisma.publicChatSession.count({ where: { ...real, visitorTurnCount: { gte: 1 } } }),
    prisma.publicChatSession.count({ where: { ...real, visitorTurnCount: { gte: 4 } } }),
    prisma.publicChatSession.count({ where: { ...real, visitorTurnCount: { gte: 9 } } }),
    prisma.publicChatSession.count({ where: { ...real, assessmentOfferCount: { gte: 1 } } }),
    prisma.assessmentHandoff.count({ where: { session: real } }),
    prisma.assessmentHandoff.count({ where: { session: real, consumedAt: { not: null } } }),
    prisma.assessmentHandoff.count({ where: { session: real, submissionId: { not: null } } }),
  ]);
  const pct = (part, whole) => (whole ? `${Math.round((part / whole) * 100)}%` : 'n/a');
  console.log(`Gary funnel, last ${days} days (test sessions excluded)`);
  console.log(`  Opened Gary ............................ ${opened}`);
  console.log(`  Sent at least one message .............. ${chatted}`);
  console.log(`  Reached Gary reply 4 (first button) .... ${reached4}  (${pct(reached4, chatted)} of chats)`);
  console.log(`  Reached Gary reply 9 (second button) ... ${reached9}  (${pct(reached9, chatted)} of chats)`);
  console.log(`  Shown the button at least once ......... ${offered}  (${pct(offered, chatted)} of chats)`);
  console.log(`  Clicked Start Your Journey ............. ${clicked}  (${pct(clicked, offered)} of those shown)`);
  console.log(`  Reached the assessment page ............ ${reachedAssessment}  (${pct(reachedAssessment, clicked)} of clicks)`);
  console.log(`  Finished the assessment ................ ${finished}  (${pct(finished, reachedAssessment)} of those who started)`);
} finally {
  await prisma.$disconnect();
}
