import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildResultEmailText } from '@/lib/resend';
import { verifySessionCapability } from '@/lib/sessionCapability';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id') ?? '';
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
  if (!id || id.length > 128 || !token || token.length > 2048) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'private, no-store' } });
  try {
    // Reuse the existing capability mechanism, with a distinct signed resource namespace.
    if (!verifySessionCapability(token, `assessment-status:${id}`)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return NextResponse.json({ error: 'Status tracking is unavailable' }, { status: 503, headers: { 'Cache-Control': 'private, no-store' } }); }
  try {
    const submission = await prisma.submission.findUnique({ where: { id }, select: { status: true, businessName: true, resultHtml: true } });
    if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: { 'Cache-Control': 'private, no-store' } });
    const text = submission.resultHtml?.trim() ? buildResultEmailText(submission.resultHtml) : '';
    return NextResponse.json({
      status: submission.status, submissionId: id, businessName: submission.businessName,
      result: { availability: text ? 'available' : submission.status === 'pending' ? 'pending' : 'unavailable', text: text || null }
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return NextResponse.json({ error: 'Status tracking is unavailable' }, { status: 503, headers: { 'Cache-Control': 'private, no-store' } }); }
}
