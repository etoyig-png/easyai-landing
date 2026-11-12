import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { waitUntil } from '@vercel/functions';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getClientIp, isGaryRateLimited } from '@/lib/rateLimit';
import { createGaryLlmAdapter } from '@/lib/gary/llm/providerFactory';
import { generateGaryReply } from '@/lib/gary/replyPipeline';
import { classifyVisitorMessageSafety } from '@/lib/gary/safetyClassifier';
import { GARY_OPENING_OPTIONS, garyOpeningMessage } from '@/lib/gary/openingQuestion';
import { enqueueFunnelEvent } from '@/lib/gary/funnelEvents';
import type { GaryConversationState } from '@/lib/gary/systemPrompt';
import type { ChatMessage } from '@/lib/gary/llm/types';
import { createSessionCapability, verifySessionCapability } from '@/lib/gary/sessionCapability';
import { GARY_MAX_MESSAGES, GARY_MAX_TRANSCRIPT_CHARS, readLimitedJson } from '@/lib/requestSafety';
import {
  advanceContactFlow,
  contactOutcomeTexts,
  detectContactIntent,
  withOpeningDisclosure,
  type ContactDraft,
  type ContactFlowReply,
  type ContactFlowRequest,
} from '@/lib/gary/contactFlow';
import { submitAssistantContact } from '@/lib/gary/contactSubmission';
import { getSiteConfig } from '@/lib/siteConfig';

export const runtime = 'nodejs';
export const maxDuration = 60;

const requestSchema = z.object({
  requestId: z.string().uuid().optional(),
  sessionId: z.string().nullish(),
  sessionCapability: z.string().max(2048).nullish(),
  anonymousId: z.string().min(1),
  message: z.string().max(2000).optional(),
  optionSelected: z.string().max(200).optional(),
  currentPage: z.string().max(500).optional(),
  referrer: z.string().max(500).optional(),
  utm: z.record(z.string(), z.string()).optional(),
  // Gary's four-step contact flow. Bounded, and every value is re-validated in contactFlow.ts.
  contactFlow: z
    .object({
      action: z.enum(['start', 'answer', 'change', 'confirm']),
      draft: z
        .object({
          step: z.enum(['name', 'contact', 'reason', 'confirm']),
          name: z.string().max(120).optional(),
          contact: z.string().max(200).optional(),
          reason: z.string().max(1000).optional(),
        })
        .optional(),
      text: z.string().max(1000).optional(),
      field: z.enum(['name', 'contact', 'reason']).optional(),
    })
    .optional(),
});

const NEUTRAL_INPUT = { options: undefined, freeText: true, placeholder: 'Type a message...' } as const;

/** Records Gary's scripted turn in the transcript and shapes the response the panel expects. */
async function respondWithContactFlow(sessionId: string, sessionCapability: string, reply: ContactFlowReply, done = false, outcome?: string) {
  await prisma.publicChatMessage.create({
    data: { sessionId, role: 'gary', content: reply.text, model: 'contact-flow', optionPayload: reply.options ? (reply.options as never) : undefined },
  });
  return NextResponse.json({
    sessionId,
    sessionCapability,
    reply: { text: reply.text, options: reply.options },
    offerAssessment: false,
    contactFlow: { draft: reply.draft, freeText: reply.freeText, placeholder: reply.placeholder, done, ...(outcome ? { outcome, retryable: !done } : {}) },
  });
}

function toFlowRequest(input: NonNullable<z.infer<typeof requestSchema>['contactFlow']>): ContactFlowRequest | null {
  const draft = input.draft as ContactDraft | undefined;
  if (input.action === 'start') return { action: 'start' };
  if (!draft) return null;
  if (input.action === 'answer') return { action: 'answer', draft, text: input.text ?? '' };
  if (input.action === 'change') return input.field ? { action: 'change', draft, field: input.field } : null;
  return { action: 'confirm', draft };
}

async function executeMessage(req: NextRequest, opening = false, admitted = false) {
  let body: unknown;
  try {
    body = await readLimitedJson(req);
  } catch (error) {
    if (error instanceof Error && error.message === 'REQUEST_TOO_LARGE') return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', issues: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const ipAddress = getClientIp(req.headers);
  if (!admitted && await isGaryRateLimited(ipAddress)) {
    return NextResponse.json({ error: 'Too many messages. Please try again later.' }, { status: 429 });
  }

  if (data.sessionId && !verifySessionCapability(data.sessionCapability ?? '', data.sessionId)) {
    return NextResponse.json({ error: 'Invalid session authorization' }, { status: 403 });
  }
  // Load or create the session.
  let session = data.sessionId
    ? await prisma.publicChatSession.findUnique({ where: { id: data.sessionId }, include: { messages: { where: { role: { not: 'system' } }, orderBy: { createdAt: 'asc' } } } })
    : null;

  const isNewSession = opening || !data.sessionId;
  if (data.sessionId && !session) return NextResponse.json({ error: 'Invalid session authorization' }, { status: 403 });
  if (!session) {
    session = await prisma.publicChatSession.create({
      data: {
        anonymousId: data.anonymousId,
        ipAddress,
        currentPage: data.currentPage,
        referrer: data.referrer,
        utm: data.utm as never,
      },
      include: { messages: true },
    });
    waitUntil(enqueueFunnelEvent({
      eventType: 'chat.session.started',
      idempotencyKey: `chat.session.started:${session.id}`,
      payload: { sessionId: session.id, anonymousId: session.anonymousId, occurredAt: session.startedAt.toISOString(), page: data.currentPage },
    }));
  }

  const capability = data.sessionCapability ?? createSessionCapability(session.id);

  const incomingLength = data.contactFlow?.text?.length ?? data.message?.length ?? 0;
  // Apply the shared bounds before every scripted or model-backed turn.
  if (session.messages.length + 2 > GARY_MAX_MESSAGES ||
      session.messages.reduce((total, item) => total + item.content.length, 0) + incomingLength + 2000 > GARY_MAX_TRANSCRIPT_CHARS) {
    return NextResponse.json({ error: 'This conversation has reached its limit. Please start a new chat.' }, { status: 409 });
  }

  // The assistant's contact flow: four scripted steps, no model, no qualification. The panel
  // echoes the draft back each turn so the server holds no flow state. Persistence happens
  // only on send, inside submitAssistantContact, in a fixed order: rate limit, durable record,
  // notification, then the Command Center handoff. Which site owns the contact, where it is
  // delivered, and what the assistant is called all come from server-side SiteConfig.
  const site = getSiteConfig();
  if (data.contactFlow) {
    if (!site.actions.contactFlow) return NextResponse.json({ error: 'Contact flow is not enabled' }, { status: 404 });
    const flowRequest = toFlowRequest(data.contactFlow);
    if (!flowRequest) return NextResponse.json({ error: 'Invalid contact flow request' }, { status: 400 });

    if (flowRequest.action === 'answer' && flowRequest.text.trim()) {
      await prisma.publicChatMessage.create({ data: { sessionId: session.id, role: 'visitor', content: flowRequest.text.trim().slice(0, 1000) } });
    }

    const advanced = advanceContactFlow(flowRequest);
    // The AI disclosure opens the flow when it is entered directly from a contact button, so it
    // is visible before any personal information is asked for. Step one is unchanged.
    const reply = flowRequest.action === 'start' ? withOpeningDisclosure(advanced, site.assistant.disclosure) : advanced;
    if (!reply.send) return respondWithContactFlow(session.id, capability, reply);

    const texts = contactOutcomeTexts(site.brand.name);
    const outcome = await submitAssistantContact({ sessionId: session.id, clientIdentity: ipAddress, send: reply.send, config: site });
    switch (outcome.kind) {
      case 'sent':
        return respondWithContactFlow(session.id, capability, { ...reply, ...NEUTRAL_INPUT, text: texts.sent }, true);
      case 'already-processed':
        return respondWithContactFlow(session.id, capability, { ...reply, ...NEUTRAL_INPUT, text: texts.alreadySent }, true);
      case 'in-progress':
        return respondWithContactFlow(session.id, capability, { ...reply, text: texts.inProgress }, false, 'pending');
      case 'limited':
        return respondWithContactFlow(session.id, capability, { ...reply, ...NEUTRAL_INPUT, text: texts.limited }, true);
      case 'changed-after-submit':
        return respondWithContactFlow(session.id, capability, { ...reply, text: 'Your earlier request is already saved and its delivery may still be pending. Please keep the original details when retrying; changes need to be confirmed with the Easy AI team.' });
      case 'saved-not-notified':
        // Contact and handoff are durable; only the email failed. Stay on the confirmation so
        // the visitor can retry, and never claim the message was sent.
        return respondWithContactFlow(session.id, capability, { ...reply, text: texts.savedNotSent });
      case 'failed':
        // Nothing durable exists. Stay on the confirmation so the visitor can try again.
        return respondWithContactFlow(session.id, capability, { ...reply, text: texts.failed });
    }
  }

  // The very first call for a brand-new session (no message yet) returns the fixed opening
  // question deterministically — no LLM call, matching the master spec's exact wording.
  if (isNewSession && !data.message) {
    // Disclosure first, then the fixed opening question: the visitor is told they are talking
    // to an AI assistant before anything else happens.
    const opening = garyOpeningMessage(site.assistant.disclosure);
    await prisma.publicChatMessage.create({
      data: { sessionId: session.id, role: 'gary', content: opening, optionPayload: GARY_OPENING_OPTIONS as never },
    });
    return NextResponse.json({
      sessionId: session.id,
      sessionCapability: createSessionCapability(session.id),
      reply: { text: opening, options: GARY_OPENING_OPTIONS },
      offerAssessment: false,
    });
  }

  const visitorMessage = data.message?.trim();
  if (!visitorMessage) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }
  if (session.messages.length >= GARY_MAX_MESSAGES || session.messages.reduce((total, item) => total + item.content.length, 0) + visitorMessage.length > GARY_MAX_TRANSCRIPT_CHARS) {
    return NextResponse.json({ error: 'This conversation has reached its limit. Please start a new chat.' }, { status: 409 });
  }

  const safetyClass = classifyVisitorMessageSafety(visitorMessage);
  await prisma.publicChatMessage.create({
    data: { sessionId: session.id, role: 'visitor', content: visitorMessage, safetyClass, optionPayload: data.optionSelected ? { optionSelected: data.optionSelected } : undefined },
  });

  // "I need to talk to the owner", "have someone call me", "can someone email me": straight
  // into the four-step contact flow. No goals, no company, no service, no discovery first.
  if (site.actions.contactFlow && detectContactIntent(visitorMessage)) {
    return respondWithContactFlow(session.id, capability, advanceContactFlow({ action: 'start' }));
  }

  const priorMessages = await prisma.publicChatMessage.findMany({ where: { sessionId: session.id }, orderBy: { createdAt: 'asc' } });
  const history: ChatMessage[] = priorMessages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role === 'visitor' ? 'user' : 'assistant', content: m.content }));

  const contact = session.identifiedContactId ? await prisma.publicContact.findUnique({ where: { id: session.identifiedContactId } }) : null;
  const state: GaryConversationState = {
    firstName: contact?.firstName,
    businessName: contact?.businessName,
    knownAnswers: [
      contact?.firstName ? `First name: ${contact.firstName}` : null,
      contact?.businessName ? `Business name: ${contact.businessName}` : null,
    ].filter((v): v is string => Boolean(v)),
    visitorTurnCount: session.visitorTurnCount,
    assessmentOfferCount: session.assessmentOfferCount,
    lastVisitorSafetyClass: safetyClass,
  };

  const adapter = createGaryLlmAdapter();
  const reply = await generateGaryReply(adapter, state, history);
  // A site that switches the assessment handoff off never offers it, whatever the model says.
  const offerAssessment = site.actions.assessmentHandoff && reply.offerAssessment;

  await prisma.publicChatMessage.create({
    data: { sessionId: session.id, role: 'gary', content: reply.text, model: reply.model },
  });

  await prisma.publicChatSession.update({
    where: { id: session.id },
    data: {
      visitorTurnCount: { increment: 1 },
      assessmentOfferCount: offerAssessment ? { increment: 1 } : undefined,
    },
  });

  return NextResponse.json({
    sessionId: session.id,
    sessionCapability: capability,
    reply: { text: reply.text },
    offerAssessment,
  });
}


/** Optional additive replay contract. The existing message primary key is the durable claim. */
export async function POST(req: NextRequest) {
  let raw: unknown;
  try { raw = await readLimitedJson(req); } catch { return NextResponse.json({error:'Invalid or oversized request'}, {status:400}); }
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({error:'Invalid request'}, {status:400});
  const data = parsed.data;
  if (!data.sessionId && data.sessionCapability) return NextResponse.json({error:'Invalid session identity'},{status:400});
  const request = (body: unknown) => new NextRequest(req.url,{method:'POST',headers:req.headers,body:JSON.stringify(body)});
  if (!data.requestId || data.contactFlow) return executeMessage(request(data));
  if (data.sessionId && !verifySessionCapability(data.sessionCapability ?? '',data.sessionId)) return NextResponse.json({error:'Invalid session authorization'},{status:403});
  const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
  // A first-request UUID is a private replay capability, like the existing random session capability.
  const sessionId = data.sessionId ?? `gary-first-${digest([getSiteConfig().siteKey,data.anonymousId,data.requestId])}`;
  const receiptId = `gary-request-${digest([sessionId,data.requestId])}`;
  const fingerprint = digest({...data,sessionCapability:undefined});
  try {
    const prior=await prisma.publicChatMessage.findUnique({where:{id:receiptId}});
    if (!prior && await isGaryRateLimited(getClientIp(req.headers))) return NextResponse.json({error:'Too many messages. Please try again later.'},{status:429});
    await prisma.$transaction(async tx => {
      // Session and receipt commit together. A losing receipt insert rolls back all its writes.
      if (!data.sessionId) await tx.publicChatSession.upsert({where:{id:sessionId},create:{id:sessionId,anonymousId:data.anonymousId,ipAddress:getClientIp(req.headers),currentPage:data.currentPage,referrer:data.referrer,utm:data.utm as never},update:{}});
      await tx.publicChatMessage.create({data:{id:receiptId,sessionId,role:'system',content:'',responseValidationResult:{fingerprint,status:'pending',claimedAt:Date.now()}}});
    });
  } catch(error) {
    if ((error as {code?:string}).code !== 'P2002') return NextResponse.json({error:'Request storage unavailable. Retry the same request identity.',outcome:'unavailable'},{status:503});
    const existing = await prisma.publicChatMessage.findUnique({where:{id:receiptId}}).catch(()=>null);
    if(!existing)return NextResponse.json({error:'Request storage unavailable. Retry the same identity.',outcome:'unavailable'},{status:503});
    const receipt = existing?.responseValidationResult as {fingerprint?:string;status?:string;body?:unknown;httpStatus?:number;claimedAt?:number} | null;
    if (receipt?.fingerprint !== fingerprint) return NextResponse.json({error:'Request identity conflicts with its saved contents',outcome:'conflict',requestId:data.requestId},{status:409});
    if (receipt.status === 'complete' && !data.sessionId && !verifySessionCapability(String((receipt.body as {sessionCapability?:string})?.sessionCapability ?? ''),sessionId)) return NextResponse.json({error:'Saved session has expired. Start a new conversation.',outcome:'expired'},{status:410});
    if (receipt.status === 'complete') return NextResponse.json(receipt.body,{status:receipt.httpStatus,headers:{'Cache-Control':'no-store'}});
    if (receipt.claimedAt && Date.now()-receipt.claimedAt>60000) return NextResponse.json({error:'The original outcome is uncertain. Preserve this request reference for support; do not automatically resubmit.',outcome:'indeterminate',requestId:data.requestId},{status:409});
    return NextResponse.json({error:'The original request is pending or its outcome needs recovery.',outcome:'pending',requestId:data.requestId},{status:409,headers:{'Retry-After':'3'}});
  }
  try {
    if (!data.sessionId) waitUntil(enqueueFunnelEvent({eventType:'chat.session.started',idempotencyKey:`chat.session.started:${sessionId}`,payload:{sessionId,anonymousId:data.anonymousId,occurredAt:new Date().toISOString(),page:data.currentPage}}));
    const response = await executeMessage(request({...data,sessionId,sessionCapability:data.sessionCapability ?? createSessionCapability(sessionId)}),!data.sessionId,true);
    const body = await response.json();
    await prisma.publicChatMessage.update({where:{id:receiptId},data:{responseValidationResult:{fingerprint,status:'complete',body,httpStatus:response.status}}});
    return NextResponse.json(body,{status:response.status});
  } catch {
    // Never re-drive an uncertain provider call. The durable pending claim survives process loss.
    return NextResponse.json({error:'The original request could not be completed safely.',outcome:'pending',requestId:data.requestId},{status:503});
  }
}


/** Read-only server integration. Never accepts a visitor session capability as founder authority. */
export async function GET(req: NextRequest) {
  const secret=process.env.GARY_FUNNEL_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({error:'History integration is not configured'},{status:503});
  const sessionId=req.nextUrl.searchParams.get('sessionId') ?? '';
  const email=req.nextUrl.searchParams.get('email') ?? '';
  const stamp=req.headers.get('x-gary-history-timestamp') ?? '';
  const signature=req.headers.get('x-gary-history-signature') ?? '';
  if (!/^[A-Za-z0-9_-]{1,200}$/.test(sessionId) || !/^\d{13}$/.test(stamp) || Math.abs(Date.now()-Number(stamp))>60000 || !/^[a-f0-9]{64}$/.test(signature)) return NextResponse.json({error:'Unauthorized'},{status:401});
  const expected=createHmac('sha256',secret).update(JSON.stringify(['gary-founder-history-v1',sessionId,email,stamp])).digest();
  if (!timingSafeEqual(expected,Buffer.from(signature,'hex'))) return NextResponse.json({error:'Unauthorized'},{status:401});
  const contact=await prisma.publicContact.findUnique({where:{sourceSessionId:sessionId}});
  if (!contact || contact.siteKey!==getSiteConfig().siteKey || !contact.consentGivenAt || (email ? contact.emailNormalized?.toLowerCase()!==email.toLowerCase() : Boolean(contact.emailNormalized))) return NextResponse.json({error:'History not found'},{status:404});
  const session=await prisma.publicChatSession.findUnique({where:{id:sessionId},select:{identifiedContactId:true}});
  if (session?.identifiedContactId!==contact.id) return NextResponse.json({error:'History not found'},{status:404});
  const messages=await prisma.publicChatMessage.findMany({where:{sessionId,role:{in:['visitor','gary']}},orderBy:[{createdAt:'asc'},{id:'asc'}],take:GARY_MAX_MESSAGES+1,select:{role:true,content:true,createdAt:true}});
  if(messages.length>GARY_MAX_MESSAGES || messages.reduce((n,m)=>n+m.content.length,0)>GARY_MAX_TRANSCRIPT_CHARS) return NextResponse.json({error:'History exceeds the supported window'},{status:409});
  return NextResponse.json({sessionId,messages},{headers:{'Cache-Control':'no-store'}});
}
