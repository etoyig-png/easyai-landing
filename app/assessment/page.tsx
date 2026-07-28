'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  WORK_SITUATION_OPTIONS,
  USING_AI_TOOLS_OPTIONS,
  AI_CHALLENGE_OPTIONS,
  DESIRED_OUTCOME_OPTIONS,
  TIME_DRAIN_OPTIONS,
  PRIVACY_CONCERN_OPTIONS,
  INDUSTRY_OPTIONS,
  SPORTS_OPTIONS,
} from '@/lib/quizQuestions';

type AnswerKey =
  | 'workSituation'
  | 'usingAiTools'
  | 'aiChallenge'
  | 'desiredOutcome'
  | 'timeDrain'
  | 'privacyConcern'
  | 'industry'
  | 'sportsFan';

interface Answers {
  workSituation: string;
  usingAiTools: string;
  aiChallenge: string;
  desiredOutcome: string;
  timeDrain: string;
  privacyConcern: string;
  industry: string;
  industryOther: string;
  sportsFan: string;
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
  sportsFan: '',
  firstName: '',
  lastName: '',
  businessName: '',
  email: '',
};

const QUESTIONS: { key: AnswerKey; title: string; options: readonly string[]; allowOther?: boolean }[] = [
  { key: 'workSituation', title: 'What best describes your work situation?', options: WORK_SITUATION_OPTIONS },
  { key: 'usingAiTools', title: 'Are you regularly using AI tools in your business?', options: USING_AI_TOOLS_OPTIONS },
  { key: 'aiChallenge', title: "What's your #1 AI challenge right now?", options: AI_CHALLENGE_OPTIONS },
  { key: 'desiredOutcome', title: "What's the #1 outcome you're hoping AI can help you achieve?", options: DESIRED_OUTCOME_OPTIONS },
  { key: 'timeDrain', title: 'Which area of your business eats up the most of your time?', options: TIME_DRAIN_OPTIONS },
  {
    key: 'privacyConcern',
    title: "When you think about using AI in your business, how worried are you about your and your customers' data privacy and security?",
    options: PRIVACY_CONCERN_OPTIONS,
  },
  { key: 'industry', title: 'What kind of business do you run?', options: INDUSTRY_OPTIONS, allowOther: true },
  { key: 'sportsFan', title: 'Are you a sports fan? If so, which do you like more?', options: SPORTS_OPTIONS },
];

const TOTAL_STEPS = QUESTIONS.length + 1; // + contact info step
const CONTACT_STEP = QUESTIONS.length;
const CONFIRM_STEP = CONTACT_STEP + 1;
const BUILDING_STEP = CONFIRM_STEP + 1;

function emailLooksValid(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function AssessmentPage() {
  const router = useRouter();
  const [formLoadedAt] = useState(() => Date.now());
  const [honeypot, setHoneypot] = useState('');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  const [otherDraft, setOtherDraft] = useState('');
  const [consent, setConsent] = useState(false);
  const [emailDraft, setEmailDraft] = useState('');
  const [editingEmail, setEditingEmail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [contactErrors, setContactErrors] = useState<Partial<Record<keyof Answers, string>>>({});

  const progressPct = useMemo(() => {
    const step1Indexed = Math.min(step + 1, TOTAL_STEPS);
    return Math.round((step1Indexed / TOTAL_STEPS) * 100);
  }, [step]);

  function selectOption(key: AnswerKey, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    if (value === 'Something else') {
      setOtherDraft(answers.industryOther);
      return; // wait for free-text continue
    }
    setStep((s) => s + 1);
  }

  function continueWithOther() {
    if (!otherDraft.trim()) return;
    setAnswers((prev) => ({ ...prev, industryOther: otherDraft.trim() }));
    setStep((s) => s + 1);
  }

  function goBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  function validateContactStep(): boolean {
    const errs: Partial<Record<keyof Answers, string>> = {};
    if (!answers.firstName.trim()) errs.firstName = 'Required';
    if (!answers.lastName.trim()) errs.lastName = 'Required';
    if (!answers.businessName.trim()) errs.businessName = 'Required';
    if (!emailLooksValid(answers.email)) errs.email = 'Enter a valid email';
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
          sportsFan: answers.sportsFan,
          firstName: answers.firstName,
          lastName: answers.lastName,
          businessName: answers.businessName,
          email: answers.email,
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
      setTimeout(() => router.push('/assessment/complete'), 2200);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <section className="min-h-screen bg-slate-50 py-16">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
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

        {step < BUILDING_STEP && (
          <div className="mb-8">
            <div className="flex justify-between text-xs text-slate-500 mb-2">
              <span className="section-label !text-teal-600">Business AI Assessment</span>
              <span>
                {Math.min(step + 1, TOTAL_STEPS)} of {TOTAL_STEPS}
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-teal-500 transition-all duration-300" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        )}

        <div className="card p-8 sm:p-10">
          {step < QUESTIONS.length && (
            <QuestionStep
              question={QUESTIONS[step]}
              selected={answers[QUESTIONS[step].key]}
              otherDraft={otherDraft}
              onOtherDraftChange={setOtherDraft}
              onSelect={(value) => selectOption(QUESTIONS[step].key, value)}
              onContinueWithOther={continueWithOther}
              onBack={step > 0 ? goBack : undefined}
            />
          )}

          {step === CONTACT_STEP && (
            <div>
              <h1 className="text-xl font-bold text-slate-900 mb-1">Almost there — where should we send your plan?</h1>
              <p className="text-sm text-slate-500 mb-6">Question 9 of 9</p>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">First name</label>
                    <input
                      className="input"
                      value={answers.firstName}
                      onChange={(e) => setAnswers((p) => ({ ...p, firstName: e.target.value }))}
                    />
                    {contactErrors.firstName && <p className="text-xs text-red-600 mt-1">{contactErrors.firstName}</p>}
                  </div>
                  <div>
                    <label className="label">Last name</label>
                    <input
                      className="input"
                      value={answers.lastName}
                      onChange={(e) => setAnswers((p) => ({ ...p, lastName: e.target.value }))}
                    />
                    {contactErrors.lastName && <p className="text-xs text-red-600 mt-1">{contactErrors.lastName}</p>}
                  </div>
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
}: {
  question: { key: AnswerKey; title: string; options: readonly string[]; allowOther?: boolean };
  selected: string;
  otherDraft: string;
  onOtherDraftChange: (v: string) => void;
  onSelect: (value: string) => void;
  onContinueWithOther: () => void;
  onBack?: () => void;
}) {
  const showOtherInput = question.allowOther && selected === 'Something else';

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

      {onBack && (
        <button onClick={onBack} className="mt-6 text-sm text-slate-500 hover:text-slate-700">
          ← Back
        </button>
      )}
    </div>
  );
}
