'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { buildQuestions, type QuestionDef, type QuestionKey } from '@/lib/quizQuestions';

type AnswerKey = QuestionKey;

interface Answers {
  workSituation: string;
  usingAiTools: string;
  aiChallenge: string;
  desiredOutcome: string;
  timeDrain: string;
  privacyConcern: string;
  industry: string;
  industryOther: string;
  leadResponse: string;
  sportsFan: string;
  favoriteTeam: string;
  websiteUrl: string;
  firstName: string;
  lastName: string;
  businessName: string;
  email: string;
}

const EMPTY_ANSWERS: Answers = {
  workSituation: '',
  usingAiTools: '',
  aiChallenge: '',
  desiredOutcome: '',
  timeDrain: '',
  privacyConcern: '',
  industry: '',
  industryOther: '',
  leadResponse: '',
  sportsFan: '',
  favoriteTeam: '',
  websiteUrl: '',
  firstName: '',
  lastName: '',
  businessName: '',
  email: '',
};

// Derived from the question list itself, never hardcoded - adding a question to
// buildQuestions() must not silently strand the step machine on a stale count.
// Called with an empty business name because only the LENGTH is needed here.
const QUESTIONS_COUNT = buildQuestions('').length;
const INTRO_STEP = 0;
const FIRST_QUESTION_STEP = 1;
const LAST_QUESTION_STEP = FIRST_QUESTION_STEP + QUESTIONS_COUNT - 1;
const CONTACT_STEP = LAST_QUESTION_STEP + 1; // final contact: last name + email
const CONFIRM_STEP = CONTACT_STEP + 1;
const BUILDING_STEP = CONFIRM_STEP + 1;
const TOTAL_NUMBERED_STEPS = QUESTIONS_COUNT + 2; // intro + questions + final contact

function emailLooksValid(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function AssessmentPage() {
  return (
    <Suspense fallback={null}>
      <AssessmentPageInner />
    </Suspense>
  );
}

// useSearchParams() (used only to read an optional Gary handoff ?token=) requires a Suspense
// boundary above it in the App Router — split into an outer wrapper + this inner component
// rather than adding Suspense deeper, since the whole page is one client-rendered form anyway.
function AssessmentPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Set when the visitor arrived from a "Book a Consultation" button. The consultation path
  // deliberately runs through the assessment first (it is what makes the call useful), so this
  // only changes what is EXPLAINED here - the questions, validation, consent and submission are
  // identical either way.
  const consultationIntent = searchParams?.get('intent') === 'consultation';
  const [formLoadedAt] = useState(() => Date.now());
  const [honeypot, setHoneypot] = useState('');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  const [funnelCorrelationId, setFunnelCorrelationId] = useState<string | undefined>(undefined);

  // Prefill from a Gary handoff token, if present — additive to manual entry; visitors who
  // arrive without a token see the form exactly as before. The signed token is verified
  // server-side (the signing secret never reaches the client); only the allow-listed fields
  // it resolves to come back.
  useEffect(() => {
    const token = searchParams?.get('token');
    if (!token) return;
    const correlationId = searchParams?.get('funnelCorrelationId');
    if (correlationId) setFunnelCorrelationId(correlationId);
    fetch('/api/gary/handoff/consume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { prefill?: Partial<Answers> } | null) => {
        if (data?.prefill) setAnswers((prev) => ({ ...prev, ...data.prefill }));
      })
      .catch(() => {
        /* prefill is a convenience, not required — visitor can still fill the form manually */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [otherDraft, setOtherDraft] = useState('');
  // Explicit "I don't have a website" declaration. Kept separate from an empty websiteUrl so a
  // blank field is distinguishable from a deliberate answer, which is what the validator checks.
  const [noWebsite, setNoWebsite] = useState(false);
  const [consent, setConsent] = useState(false);
  const [emailDraft, setEmailDraft] = useState('');
  const [editingEmail, setEditingEmail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [contactErrors, setContactErrors] = useState<Partial<Record<keyof Answers, string>>>({});

  const questions: QuestionDef[] = useMemo(() => buildQuestions(answers.businessName), [answers.businessName]);

  const progressPct = useMemo(() => {
    const step1Indexed = Math.min(step + 1, TOTAL_NUMBERED_STEPS);
    return Math.round((step1Indexed / TOTAL_NUMBERED_STEPS) * 100);
  }, [step]);

  function selectOption(key: AnswerKey, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    if (value === 'Something else') {
      setOtherDraft(answers.industryOther);
      return; // wait for free-text continue
    }
    // Picking a sport reveals the favorite-team field on the same screen, so this must not
    // auto-advance the way every other choice does. "Not really a sports fan" has no follow-up
    // and advances immediately.
    if (key === 'sportsFan' && (value === 'Football' || value === 'Basketball')) {
      setAnswers((prev) => ({ ...prev, favoriteTeam: '' }));
      return;
    }
    setStep((s) => s + 1);
  }

  // Shared "continue after a write-in" for the two screens that have one. Which field it commits
  // depends on the question being answered: the industry screen writes industryOther, the sports
  // screen writes favoriteTeam.
  function continueWithOther() {
    const currentKey = questions[step - FIRST_QUESTION_STEP]?.key;
    if (currentKey === 'sportsFan') {
      if (!answers.favoriteTeam.trim()) return;
      setStep((s) => s + 1);
      return;
    }
    if (!otherDraft.trim()) return;
    setAnswers((prev) => ({ ...prev, industryOther: otherDraft.trim() }));
    setStep((s) => s + 1);
  }

  function goBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  function validateIntroStep(): boolean {
    const errs: Partial<Record<keyof Answers, string>> = {};
    if (!answers.firstName.trim()) errs.firstName = 'Required';
    if (!answers.businessName.trim()) errs.businessName = 'Required';
    setContactErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function continueFromIntro() {
    if (!validateIntroStep()) return;
    setStep(FIRST_QUESTION_STEP);
  }

  function validateContactStep(): boolean {
    const errs: Partial<Record<keyof Answers, string>> = {};
    if (!answers.lastName.trim()) errs.lastName = 'Required';
    if (!emailLooksValid(answers.email)) errs.email = 'Enter a valid email';
    // Website is required one way or the other: a real http(s) address, or the explicit
    // "no website" checkbox. Blank-and-unchecked is not a valid answer. Restricted to http/https
    // so a javascript:, data: or file: URL can never be submitted.
    if (!noWebsite) {
      const url = answers.websiteUrl.trim();
      if (!url) errs.websiteUrl = 'Enter your website, or select that you do not have one';
      else if (!/^https?:\/\/[^\s]+\.[^\s]+$/i.test(url)) errs.websiteUrl = 'Enter a valid address starting with http:// or https://';
    }
    setContactErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function continueFromContact() {
    if (!validateContactStep()) return;
    setEmailDraft(answers.email);
    setStep((s) => s + 1);
  }

  function saveEmailEdit() {
    if (!emailLooksValid(emailDraft)) return;
    setAnswers((prev) => ({ ...prev, email: emailDraft }));
    setEditingEmail(false);
  }

  async function confirmAndSend() {
    if (!consent || submitting) return;
    setSubmitError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workSituation: answers.workSituation,
          usingAiTools: answers.usingAiTools,
          aiChallenge: answers.aiChallenge,
          desiredOutcome: answers.desiredOutcome,
          timeDrain: answers.timeDrain,
          privacyConcern: answers.privacyConcern,
          industry: answers.industry,
          industryOther: answers.industryOther || undefined,
          // Sent as undefined rather than '' when unanswered: the schema types this as an
          // optional enum, and an empty string is not a member of it.
          leadResponse: answers.leadResponse || undefined,
          sportsFan: answers.sportsFan,
          favoriteTeam: answers.favoriteTeam || undefined,
          websiteUrl: noWebsite ? undefined : answers.websiteUrl || undefined,
          noWebsite,
          firstName: answers.firstName,
          lastName: answers.lastName,
          businessName: answers.businessName,
          email: answers.email,
          funnelCorrelationId,
          consent: true,
          companyUrl: honeypot,
          formLoadedAt,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Something went wrong. Please try again.');
      }

      setStep(BUILDING_STEP);
      setTimeout(() => router.push(consultationIntent ? '/assessment/complete?intent=consultation' : '/assessment/complete'), 2200);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <section className="min-h-screen bg-navy-900 py-16 px-4 sm:px-6">
      {/* Navy page surface with a white content card: matches the site's "navy background,
          white content area" pattern, and keeps the form itself on a light surface where its
          inputs, labels and validation text stay high-contrast and readable. */}
      <div className="max-w-2xl mx-auto rounded-2xl bg-white px-5 py-8 shadow-xl sm:px-8">
        {/* Honeypot — invisible to real visitors, catches basic bots */}
        <input
          type="text"
          name="companyUrl"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
        />

        {step < CONFIRM_STEP && (
          <div className="mb-8">
            <div className="flex justify-between text-xs text-slate-500 mb-2">
              <span className="section-label !text-teal-600">Business AI Assessment</span>
              <span>
                {Math.min(step + 1, TOTAL_NUMBERED_STEPS)} of {TOTAL_NUMBERED_STEPS}
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-teal-500 transition-all duration-300" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        )}

        <div className="card p-8 sm:p-10">
          {step === INTRO_STEP && (
            <div>
              {consultationIntent && (
                <div className="mb-6 rounded-xl border border-teal/40 bg-teal/10 p-4 sm:p-5">
                  <p className="text-sm text-slate-700 leading-relaxed">
                    This assessment is free. It helps us understand your business, identify your needs, and
                    prepare for a more useful consultation. You&rsquo;ll also receive valuable feedback and
                    practical improvements you can begin implementing right away.
                  </p>
                </div>
              )}
              <h1 className="text-xl font-bold text-slate-900 mb-1">Let&rsquo;s personalize this for your business</h1>
              <p className="text-sm text-slate-500 mb-6">Just two quick things before we start.</p>
              <div className="space-y-4">
                <div>
                  <label className="label">First name</label>
                  <input
                    className="input"
                    value={answers.firstName}
                    onChange={(e) => setAnswers((p) => ({ ...p, firstName: e.target.value }))}
                    autoFocus
                  />
                  {contactErrors.firstName && <p className="text-xs text-red-600 mt-1">{contactErrors.firstName}</p>}
                </div>
                <div>
                  <label className="label">Business name</label>
                  <input
                    className="input"
                    value={answers.businessName}
                    onChange={(e) => setAnswers((p) => ({ ...p, businessName: e.target.value }))}
                  />
                  {contactErrors.businessName && <p className="text-xs text-red-600 mt-1">{contactErrors.businessName}</p>}
                </div>
              </div>
              <div className="flex items-center justify-end mt-8">
                <button onClick={continueFromIntro} className="btn-primary px-8 py-3">
                  Continue →
                </button>
              </div>
            </div>
          )}

          {step >= FIRST_QUESTION_STEP && step <= LAST_QUESTION_STEP && (
            <QuestionStep
              favoriteTeam={answers.favoriteTeam}
              onFavoriteTeamChange={(v) => setAnswers((p) => ({ ...p, favoriteTeam: v }))}
              favoriteTeamError={contactErrors.favoriteTeam}
              question={questions[step - FIRST_QUESTION_STEP]}
              selected={answers[questions[step - FIRST_QUESTION_STEP].key]}
              otherDraft={otherDraft}
              onOtherDraftChange={setOtherDraft}
              onSelect={(value) => selectOption(questions[step - FIRST_QUESTION_STEP].key, value)}
              onContinueWithOther={continueWithOther}
              onBack={goBack}
            />
          )}

          {step === CONTACT_STEP && (
            <div>
              <h1 className="text-xl font-bold text-slate-900 mb-1">Almost there — where should we send your plan?</h1>
              <div className="space-y-4">
                <div>
                  <label className="label">Last name</label>
                  <input
                    className="input"
                    value={answers.lastName}
                    onChange={(e) => setAnswers((p) => ({ ...p, lastName: e.target.value }))}
                  />
                  {contactErrors.lastName && <p className="text-xs text-red-600 mt-1">{contactErrors.lastName}</p>}
                </div>
                <div>
                  <label className="label">Email address</label>
                  <input
                    type="email"
                    className="input"
                    value={answers.email}
                    onChange={(e) => setAnswers((p) => ({ ...p, email: e.target.value }))}
                  />
                  {contactErrors.email && <p className="text-xs text-red-600 mt-1">{contactErrors.email}</p>}
                </div>
                <div>
                  <label className="label" htmlFor="website-url">Business website</label>
                  <input
                    id="website-url"
                    type="url"
                    inputMode="url"
                    placeholder="https://"
                    className="input disabled:bg-slate-100 disabled:text-slate-400"
                    value={answers.websiteUrl}
                    disabled={noWebsite}
                    onChange={(e) => setAnswers((p) => ({ ...p, websiteUrl: e.target.value }))}
                  />
                  {contactErrors.websiteUrl && <p className="text-xs text-red-600 mt-1">{contactErrors.websiteUrl}</p>}
                  <label className="mt-2 flex items-start gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={noWebsite}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setNoWebsite(checked);
                        // Clearing the field on check is what makes the URL requirement actually
                        // go away rather than sit there as a stale value.
                        if (checked) {
                          setAnswers((p) => ({ ...p, websiteUrl: '' }));
                          setContactErrors((prev) => ({ ...prev, websiteUrl: undefined }));
                        }
                      }}
                    />
                    I do not currently have a website.
                  </label>
                </div>
              </div>
              <div className="flex items-center justify-between mt-8">
                <button onClick={goBack} className="text-sm text-slate-500 hover:text-slate-700">
                  ← Back
                </button>
                <button onClick={continueFromContact} className="btn-primary px-8 py-3">
                  Continue →
                </button>
              </div>
            </div>
          )}

          {step === CONFIRM_STEP && (
            <div>
              <h1 className="text-xl font-bold text-slate-900 mb-4">One more thing</h1>
              <div className="bg-slate-100 rounded-xl p-5 mb-6">
                <p className="text-sm text-slate-600 mb-3">We&rsquo;ll send your personalized AI Action Plan to:</p>
                {editingEmail ? (
                  <div className="flex gap-2">
                    <input
                      type="email"
                      className="input"
                      value={emailDraft}
                      onChange={(e) => setEmailDraft(e.target.value)}
                      autoFocus
                    />
                    <button onClick={saveEmailEdit} className="btn-primary px-4 whitespace-nowrap">
                      Save
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-slate-900 break-all">{answers.email}</span>
                    <button
                      onClick={() => {
                        setEmailDraft(answers.email);
                        setEditingEmail(true);
                      }}
                      className="text-sm text-brand-600 underline whitespace-nowrap"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>

              <label className="flex items-start gap-3 cursor-pointer mb-6">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1 accent-brand-600"
                />
                <span className="text-sm text-slate-600">
                  I consent to Easy AI Consulting contacting me by email about my results and next steps. We don&rsquo;t sell your
                  information or add you to unrelated marketing lists.
                </span>
              </label>

              {submitError && <p className="text-sm text-red-600 mb-4">{submitError}</p>}

              <div className="flex items-center justify-between">
                <button onClick={goBack} className="text-sm text-slate-500 hover:text-slate-700">
                  ← Back
                </button>
                <button
                  onClick={confirmAndSend}
                  disabled={!consent || editingEmail || submitting}
                  className="btn-green px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Sending…' : 'Confirm & Send →'}
                </button>
              </div>
            </div>
          )}

          {step === BUILDING_STEP && (
            <div className="text-center py-6">
              <div className="text-5xl mb-4">⚙️</div>
              <h1 className="text-2xl font-bold text-slate-900 mb-3">Thanks, {answers.firstName}!</h1>
              <p className="text-slate-600 leading-relaxed">
                We&rsquo;re building your personalized AI Action Plan for <strong>{answers.businessName}</strong> right now. This
                usually takes 15+ minutes — we&rsquo;ll email it to you at <strong>{answers.email}</strong> the moment it&rsquo;s
                ready.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function QuestionStep({
  question,
  selected,
  otherDraft,
  onOtherDraftChange,
  onSelect,
  onContinueWithOther,
  onBack,
  favoriteTeam,
  onFavoriteTeamChange,
  favoriteTeamError,
}: {
  question: QuestionDef;
  selected: string;
  otherDraft: string;
  onOtherDraftChange: (v: string) => void;
  onSelect: (value: string) => void;
  onContinueWithOther: () => void;
  onBack?: () => void;
  favoriteTeam: string;
  onFavoriteTeamChange: (v: string) => void;
  favoriteTeamError?: string;
}) {
  const showOtherInput = question.allowOther && selected === 'Something else';
  // Favorite team appears only once a sport is chosen, and is hidden entirely for
  // "Not really a sports fan" so that answer never demands a follow-up.
  const showFavoriteTeam =
    question.key === 'sportsFan' && (selected === 'Football' || selected === 'Basketball');

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-6">{question.title}</h1>
      <div className="space-y-3">
        {question.options.map((option) => {
          const isSelected = selected === option;
          return (
            <button
              key={option}
              onClick={() => onSelect(option)}
              className={`w-full text-left px-5 py-4 rounded-xl border transition-colors ${
                isSelected
                  ? 'border-navy-700 bg-navy-50 text-navy-900 font-medium'
                  : 'border-slate-200 hover:border-navy-300 hover:bg-slate-50 text-slate-700'
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {showOtherInput && (
        <div className="mt-4">
          <label className="label">Tell us what kind of business you run</label>
          <div className="flex gap-2">
            <input
              className="input"
              value={otherDraft}
              onChange={(e) => onOtherDraftChange(e.target.value)}
              autoFocus
              placeholder="e.g. Landscaping company"
            />
            <button onClick={onContinueWithOther} disabled={!otherDraft.trim()} className="btn-primary px-6 whitespace-nowrap disabled:opacity-50">
              Continue →
            </button>
          </div>
        </div>
      )}

      {showFavoriteTeam && (
        <div className="mt-4">
          <label className="label" htmlFor="favorite-team">What&rsquo;s your favorite team?</label>
          <div className="flex gap-2">
            <input
              id="favorite-team"
              className="input"
              value={favoriteTeam}
              onChange={(e) => onFavoriteTeamChange(e.target.value)}
              autoFocus
            />
            <button
              onClick={onContinueWithOther}
              disabled={!favoriteTeam.trim()}
              className="btn-primary px-6 whitespace-nowrap disabled:opacity-50"
            >
              Continue →
            </button>
          </div>
          {favoriteTeamError && <p className="text-xs text-red-600 mt-1">{favoriteTeamError}</p>}
        </div>
      )}

      {onBack && (
        <button onClick={onBack} className="mt-6 text-sm text-slate-500 hover:text-slate-700">
          ← Back
        </button>
      )}
    </div>
  );
}
