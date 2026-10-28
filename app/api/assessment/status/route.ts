import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySessionCapability } from '@/lib/sessionCapability';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id') ?? '';
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
  if (!id || id.length > 128 || !token || token.length > 2048) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    // Reuse the existing capability mechanism, with a distinct signed resource namespace.
    if (!verifySessionCapability(token, `assessment-status:${id}`)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  } catch { return NextResponse.json({ error: 'Status tracking is unavailable' }, { status: 503 }); }
  try {
    const submission = await prisma.submission.findUnique({ where: { id }, select: { status: true } });
    if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ status: submission.status }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return NextResponse.json({ error: 'Status tracking is unavailable' }, { status: 503 }); }
}
