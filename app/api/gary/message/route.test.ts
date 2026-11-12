import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GARY_MAX_MESSAGES, GARY_MAX_TRANSCRIPT_CHARS } from '@/lib/requestSafety';

const mocks = vi.hoisted(() => ({ session: vi.fn(), write: vi.fn(), limited: vi.fn(), update: vi.fn(), reply: vi.fn(), contact: vi.fn(), receipt: vi.fn(), settle: vi.fn(), upsert: vi.fn(), history: vi.fn(), person: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: {
  $transaction: async (run: (tx: unknown)=>unknown) => run({publicChatSession:{upsert:mocks.upsert},publicChatMessage:{create:mocks.write}}),
  publicChatSession: { findUnique: mocks.session, update: mocks.update, upsert:mocks.upsert },
  publicChatMessage: { create: mocks.write, findUnique:mocks.receipt, update:mocks.settle, findMany: mocks.history },
  publicContact: { findUnique: mocks.person },
} }));
vi.mock('@/lib/gary/llm/providerFactory', () => ({ createGaryLlmAdapter: () => ({}) }));
vi.mock('@/lib/gary/replyPipeline', () => ({ generateGaryReply: mocks.reply }));
vi.mock('@/lib/rateLimit', () => ({ getClientIp: () => 'fixture-ip', isGaryRateLimited: mocks.limited }));
vi.mock('@/lib/gary/sessionCapability', () => ({ createSessionCapability: () => 'fixture-cap', verifySessionCapability: () => true }));
vi.mock('@/lib/gary/contactSubmission', () => ({ submitAssistantContact: mocks.contact }));
import { POST, GET } from './route';

beforeEach(() => { vi.clearAllMocks(); mocks.limited.mockResolvedValue(false); mocks.history.mockResolvedValue([]); mocks.person.mockResolvedValue(null); });

describe('scripted contact turns respect the shared conversation budget', () => {
  for (const action of ['start', 'confirm'] as const) {
    it(`rejects ${action} at the message ceiling before writing or sending`, async () => {
      mocks.session.mockResolvedValue({ id: 'fixture-session', messages: Array.from({ length: GARY_MAX_MESSAGES }, () => ({ content: 'fixture' })) });
      const response = await POST(new NextRequest('http://localhost/api/gary/message', {
        method: 'POST', body: JSON.stringify({ anonymousId: 'fixture-anon', sessionId: 'fixture-session', sessionCapability: 'fixture-cap', contactFlow: { action, draft: { step: 'confirm' } } }),
      }));
      expect(response.status).toBe(409);
      expect(mocks.write).not.toHaveBeenCalled();
    });
  }
  it('rejects a scripted turn at the transcript character ceiling', async () => {
    mocks.session.mockResolvedValue({ id: 'fixture-session', messages: [{ content: 'x'.repeat(GARY_MAX_TRANSCRIPT_CHARS) }] });
    const response = await POST(new NextRequest('http://localhost/api/gary/message', {
      method: 'POST', body: JSON.stringify({ anonymousId: 'fixture-anon', sessionId: 'fixture-session', sessionCapability: 'fixture-cap', contactFlow: { action: 'start' } }),
    }));
    expect(response.status).toBe(409);
    expect(mocks.write).not.toHaveBeenCalled();
  });
});

describe('the assessment handoff switch', () => {
  const ask = () => POST(new NextRequest('http://localhost/api/gary/message', {
    method: 'POST', body: JSON.stringify({ anonymousId: 'fixture-anon', sessionId: 'fixture-session', sessionCapability: 'fixture-cap', message: 'What could AI do for my bakery?' }),
  }));
  beforeEach(() => {
    mocks.session.mockResolvedValue({ id: 'fixture-session', messages: [], visitorTurnCount: 3, assessmentOfferCount: 0 });
    mocks.reply.mockResolvedValue({ text: 'An assessment would show that.', model: 'fixture', offerAssessment: true });
  });
  afterEach(() => { vi.unstubAllEnvs(); });

  it('passes the model offer through while the handoff is enabled', async () => {
    await expect((await ask()).json()).resolves.toMatchObject({ offerAssessment: true });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ assessmentOfferCount: { increment: 1 } }) }));
  });

  it('never offers or counts an assessment while ASSISTANT_ASSESSMENT_HANDOFF_ENABLED=false', async () => {
    vi.stubEnv('ASSISTANT_ASSESSMENT_HANDOFF_ENABLED', 'false');
    await expect((await ask()).json()).resolves.toMatchObject({ offerAssessment: false });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ assessmentOfferCount: undefined }) }));
  });
});


it('preserves confirmation controls and an explicit pending outcome while the existing send lease is held', async () => {
  mocks.session.mockResolvedValue({id:'fixture-session',messages:[]});
  mocks.contact.mockResolvedValue({kind:'in-progress'});
  const response=await POST(new NextRequest('http://localhost/api/gary/message',{
    method:'POST',body:JSON.stringify({anonymousId:'fixture-anon',sessionId:'fixture-session',sessionCapability:'fixture-cap',contactFlow:{action:'confirm',draft:{step:'confirm',name:'Fixture Person',contact:'fixture@example.test',reason:'Please discuss this fixture.'}}})
  }));
  expect(response.status).toBe(200);
  const body=await response.json();
  expect(body.contactFlow).toMatchObject({done:false,outcome:'pending',retryable:true,draft:{step:'confirm'}});
  expect(body.reply.options.length).toBeGreaterThan(0);
  expect(mocks.contact).toHaveBeenCalledTimes(1);
});


it('replays a completed ordinary turn without another provider call', async () => {
  const input={requestId:'12345678-1234-4234-8234-123456789012',anonymousId:'fixture-anon',sessionId:'fixture-session',sessionCapability:'fixture-cap',message:'Hello'};
  mocks.session.mockResolvedValue({id:'fixture-session',messages:[],visitorTurnCount:0,assessmentOfferCount:0});
  mocks.reply.mockResolvedValue({text:'Saved reply',model:'fixture',offerAssessment:false});
  let saved: unknown;
  mocks.settle.mockImplementation(async (args)=>{saved=args.data.responseValidationResult;});
  mocks.write.mockResolvedValue({});
  const ask=()=>POST(new NextRequest('http://localhost/api/gary/message',{method:'POST',body:JSON.stringify(input)}));
  const first=await(await ask()).json();
  mocks.write.mockRejectedValueOnce({code:'P2002'});
  mocks.receipt.mockResolvedValue({responseValidationResult:saved});
  expect(await(await ask()).json()).toEqual(first);
  expect(mocks.reply).toHaveBeenCalledTimes(1);
});


it('returns pending for a concurrent duplicate without invoking the provider', async()=>{
  mocks.write.mockRejectedValueOnce({code:'P2002'});
  const input={requestId:'12345678-1234-4234-8234-123456789012',anonymousId:'fixture-anon',sessionId:'fixture-session',sessionCapability:'fixture-cap',message:'Hello'};
  const {createHash}=await import('node:crypto');
  // Zod's canonical field order is used by the server.
  const canonical={requestId:input.requestId,sessionId:input.sessionId,sessionCapability:undefined,anonymousId:input.anonymousId,message:input.message};
  mocks.receipt.mockResolvedValue({responseValidationResult:{fingerprint:createHash('sha256').update(JSON.stringify(canonical)).digest('hex'),status:'pending'}});
  const response=await POST(new NextRequest('http://localhost/api/gary/message',{method:'POST',body:JSON.stringify(input)}));
  expect(response.status).toBe(409);
  expect((await response.json()).outcome).toBe('pending');
  expect(mocks.reply).not.toHaveBeenCalled();
});

it('refuses a changed payload under an existing replay identity', async()=>{
  mocks.write.mockRejectedValueOnce({code:'P2002'});
  mocks.receipt.mockResolvedValue({responseValidationResult:{fingerprint:'different',status:'complete'}});
  const response=await POST(new NextRequest('http://localhost/api/gary/message',{method:'POST',body:JSON.stringify({requestId:'12345678-1234-4234-8234-123456789012',anonymousId:'fixture-anon',sessionId:'fixture-session',sessionCapability:'fixture-cap',message:'Changed'})}));
  expect(response.status).toBe(409);expect(mocks.reply).not.toHaveBeenCalled();
});

it('claims a first opening transactionally before writing its opening response', async()=>{
  const order:string[]=[];
  mocks.upsert.mockImplementation(async()=>{order.push('session');});
  mocks.write.mockImplementation(async(args)=>{order.push(args.data.role==='system'?'claim':'opening');return {};});
  mocks.session.mockResolvedValue({id:'first',messages:[]});
  mocks.settle.mockResolvedValue({});
  const response=await POST(new NextRequest('http://localhost/api/gary/message',{method:'POST',body:JSON.stringify({requestId:'12345678-1234-4234-8234-123456789012',anonymousId:'first-fixture'})}));
  expect(response.status).toBe(200);
  expect(order).toEqual(['session','claim','opening']);
  expect(mocks.reply).not.toHaveBeenCalled();
});

it('leaves an uncertain provider failure pending rather than issuing a second call', async()=>{
  mocks.write.mockResolvedValue({});
  mocks.session.mockResolvedValue({id:'fixture-session',messages:[],visitorTurnCount:0,assessmentOfferCount:0});
  mocks.reply.mockRejectedValue(new Error('synthetic provider failure'));
  const response=await POST(new NextRequest('http://localhost/api/gary/message',{method:'POST',body:JSON.stringify({requestId:'12345678-1234-4234-8234-123456789012',anonymousId:'fixture-anon',sessionId:'fixture-session',sessionCapability:'fixture-cap',message:'Hello'})}));
  expect(response.status).toBe(503);
  expect((await response.json()).outcome).toBe('pending');
  expect(mocks.reply).toHaveBeenCalledTimes(1);
  expect(mocks.settle).not.toHaveBeenCalled();
});


describe('signed founder-history integration',()=>{
 beforeEach(async()=>{process.env.GARY_FUNNEL_WEBHOOK_SECRET='history-fixture';const {getSiteConfig}=await import('@/lib/siteConfig');mocks.person.mockResolvedValue({id:'contact',siteKey:getSiteConfig().siteKey,consentGivenAt:new Date(),emailNormalized:'fixture@example.test'});mocks.session.mockResolvedValue({identifiedContactId:'contact'});mocks.history.mockResolvedValue([{role:'visitor',content:'Fixture',createdAt:new Date()}]);});
 async function read(email='fixture@example.test',age=0,bad=false){const {createHmac}=await import('node:crypto');const stamp=String(Date.now()-age);const signature=createHmac('sha256','history-fixture').update(JSON.stringify(['gary-founder-history-v1','session',email,stamp])).digest('hex');return GET(new NextRequest(`https://fixture.test/api/gary/message?sessionId=session&email=${encodeURIComponent(email)}`,{headers:{'x-gary-history-timestamp':stamp,'x-gary-history-signature':bad?'0'.repeat(64):signature}}));}
 it('rejects invalid and stale signatures before data access',async()=>{expect((await read(undefined,0,true)).status).toBe(401);expect((await read(undefined,61000)).status).toBe(401);expect(mocks.person).not.toHaveBeenCalled();});
 it('denies a different site',async()=>{mocks.person.mockResolvedValue({id:'contact',siteKey:'other',consentGivenAt:new Date(),emailNormalized:'fixture@example.test'});expect((await read()).status).toBe(404);});
 it('denies mismatched person association',async()=>{mocks.session.mockResolvedValue({identifiedContactId:'other'});expect((await read()).status).toBe(404);});
 it('supports phone-only consented contacts and excludes system records in the query',async()=>{const {getSiteConfig}=await import('@/lib/siteConfig');mocks.person.mockResolvedValue({id:'contact',siteKey:getSiteConfig().siteKey,consentGivenAt:new Date(),emailNormalized:null});expect((await read('')).status).toBe(200);expect(mocks.history).toHaveBeenCalledWith(expect.objectContaining({where:{sessionId:'session',role:{in:['visitor','gary']}}}));});
 it('refuses an overlong history without silently truncating',async()=>{mocks.history.mockResolvedValue(Array(81).fill({role:'visitor',content:'x',createdAt:new Date()}));expect((await read()).status).toBe(409);});
});

it('recovers a response lost after receipt settlement without repeating model work',async()=>{
 const input={requestId:'12345678-1234-4234-8234-123456789012',anonymousId:'fixture-anon',sessionId:'fixture-session',sessionCapability:'fixture-cap',message:'Hello'};
 mocks.session.mockResolvedValue({id:'fixture-session',messages:[],visitorTurnCount:0,assessmentOfferCount:0});mocks.reply.mockResolvedValue({text:'Recovered',model:'fixture',offerAssessment:false});mocks.write.mockResolvedValue({});
 let receipt:unknown;mocks.settle.mockImplementation(async(args)=>{receipt=args.data.responseValidationResult;throw new Error('lost acknowledgement');});
 const ask=()=>POST(new NextRequest('http://localhost/api/gary/message',{method:'POST',body:JSON.stringify(input)}));
 expect((await ask()).status).toBe(503);
 mocks.write.mockRejectedValueOnce({code:'P2002'});mocks.receipt.mockResolvedValue({responseValidationResult:receipt});
 const recovered=await ask();expect(recovered.status).toBe(200);expect((await recovered.json()).reply.text).toBe('Recovered');expect(mocks.reply).toHaveBeenCalledTimes(1);
});

it('serializes overlapping ordinary requests in the claim mock and later replays the winner',async()=>{
 const input={requestId:'12345678-1234-4234-8234-123456789012',anonymousId:'fixture-anon',sessionId:'fixture-session',sessionCapability:'fixture-cap',message:'Hello'};
 let receipt:any=null;let finish!:(v:unknown)=>void;
 mocks.receipt.mockImplementation(async()=>receipt?{responseValidationResult:receipt}:null);
 mocks.write.mockImplementation(async(args)=>{if(args.data.role==='system'){if(receipt)throw {code:'P2002'};receipt=args.data.responseValidationResult;}return {};});
 mocks.settle.mockImplementation(async(args)=>{receipt=args.data.responseValidationResult;return {};});
 mocks.session.mockResolvedValue({id:'fixture-session',messages:[],visitorTurnCount:0,assessmentOfferCount:0});
 mocks.reply.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
 const ask=()=>POST(new NextRequest('http://localhost/api/gary/message',{method:'POST',body:JSON.stringify(input)}));
 const first=ask();await vi.waitFor(()=>expect(mocks.reply).toHaveBeenCalledTimes(1));
 const second=await ask();expect(second.status).toBe(409);expect((await second.json()).outcome).toBe('pending');
 finish({text:'Winner',model:'fixture',offerAssessment:false});const saved=await(await first).json();
 mocks.limited.mockResolvedValue(true);expect(await(await ask()).json()).toEqual(saved);expect(mocks.reply).toHaveBeenCalledTimes(1);
});
