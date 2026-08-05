import { NextRequest, NextResponse } from 'next/server';
import { drainFunnelEventOutbox } from '@/lib/gary/funnelEvents';

export const runtime = 'nodejs';

// Protected trigger for a future scheduled retry (e.g. Vercel Cron). Not wired to any schedule
// in this pass — the opportunistic drain in lib/gary/funnelEvents.ts covers normal traffic;
// this route exists so a real schedule can be pointed at it later without new code.
function authorized(request: NextRequest): boolean {
  const secret = process.env.GARY_FUNNEL_DRAIN_SECRET;
  return Boolean(secret && request.headers.get('authorization') === `Bearer ${secret}`);
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  }
  const result = await drainFunnelEventOutbox({ limit: 25 });
  return NextResponse.json(result);
}
