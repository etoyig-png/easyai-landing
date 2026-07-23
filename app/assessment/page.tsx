'use client';
import { useState } from 'react';

const fields = [
  { section: 'Company Information', items: [
    { id: 'company_name', label: 'Business name', type: 'text', required: true },
    { id: 'website', label: 'Business website (if any)', type: 'url', required: false },
    { id: 'industry', label: 'Industry or type of business', type: 'text', required: true },
    { id: 'location', label: 'City / State / Service area', type: 'text', required: true },
    { id: 'team_size', label: 'Approximate team size', type: 'select', options: ['Just me', '2-5', '6-20', '21-50', '50+'], required: true },
    { id: 'contact_name', label: 'Your name', type: 'text', required: true },
    { id: 'role', label: 'Your role', type: 'text', required: true },
    { id: 'email', label: 'Email address', type: 'email', required: true },
    { id: 'phone', label: 'Phone number (optional)', type: 'tel', required: false },
  ]},
  { section: 'Current Tools', items: [
    { id: 'main_tools', label: 'Main software and tools you use today', type: 'textarea', required: true },
    { id: 'crm', label: 'How do you track leads or customers? (CRM, spreadsheet, email, etc.)', type: 'textarea', required: false },
    { id: 'ai_used', label: 'Any AI tools you currently use? What works? What does not?', type: 'textarea', required: false },
  ]},
  { section: 'Repetitive Work & Time Drains', items: [
    { id: 'repetitive_tasks', label: 'What tasks repeat daily or weekly that someone (or something) has to handle manually?', type: 'textarea', required: true },
    { id: 'time_drain', label: 'What is your single biggest time drain right now?', type: 'textarea', required: true },
    { id: 'manual_hours', label: 'Roughly how many hours per week go to manual/repetitive work?', type: 'select', options: ['Less than 2 hrs', '2-5 hrs', '5-10 hrs', '10-20 hrs', 'More than 20 hrs'], required: false },
  ]},
  { section: 'Business Goals', items: [
    { id: 'most_important', label: 'What outcome matters most to you right now?', type: 'select', options: ['Save employee time', 'Reduce operating expenses', 'Improve customer experience', 'Increase revenue', 'Fix a specific broken process', 'Other'], required: true },
    { id: 'success_looks_like', label: 'What would success look like in 90 days?', type: 'textarea', required: true },
    { id: 'urgency', label: 'How urgent is this problem?', type: 'select', options: ['It is costing us now', 'Important but not urgent', 'Just exploring options'], required: true },
  ]},
  { section: 'Boundaries', items: [
    { id: 'off_limits', label: 'Is there anything AI or automation should never access, change, send, or decide without a human?', type: 'textarea', required: false },
    { id: 'sensitive_data', label: 'Does your business handle sensitive customer data (health, financial, legal, etc.)?', type: 'select', options: ['Yes', 'No', 'Unsure'], required: false },
  ]},
];

export default function AssessmentPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  function handleChange(id: string, value: string) {
    setForm(prev => ({ ...prev, [id]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: Connect to your form backend (Formspree, Resend, etc.)
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-lg text-center card p-12">
          <div className="text-5xl mb-4">&#10003;</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">Assessment received.</h1>
          <p className="text-slate-500 mb-4 leading-relaxed">Thank you for taking the time to complete this. We will review your responses and follow up within one business day with next steps.</p>
          <p className="text-sm text-slate-400">This assessment is a lead-generation and pre-consultation tool. It is not the full consulting assessment -- that happens during your consultation call.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <section className="bg-gradient-to-br from-brand-950 to-brand-700 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <p className="section-label text-teal-300 mb-3">Lead-generation assessment</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">AI Opportunity Assessment</h1>
          <p className="text-brand-100 text-lg max-w-2xl">Answer these questions so we can understand your business before we talk. This takes about 10 minutes. It is not the full consulting assessment -- that happens on your consultation call.</p>
        </div>
      </section>

      <section className="py-16 bg-slate-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 text-sm text-amber-800">
            <strong>Privacy notice:</strong> Your responses are used only to prepare for your consultation. We do not sell your information or add you to marketing lists without your permission. By submitting, you consent to EasyAI reviewing your responses and following up about your consultation.
          </div>

          <form onSubmit={handleSubmit} className="space-y-10">
            {fields.map(section => (
              <div key={section.section}>
                <h2 className="text-lg font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-200">{section.section}</h2>
                <div className="space-y-4">
                  {section.items.map(field => (
                    <div key={field.id}>
                      <label htmlFor={field.id} className="label">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </label>
                      {field.type === 'textarea' ? (
                        <textarea
                          id={field.id}
                          required={field.required}
                          rows={3}
                          className="input resize-y"
                          value={form[field.id] || ''}
                          onChange={e => handleChange(field.id, e.target.value)}
                        />
                      ) : field.type === 'select' ? (
                        <select
                          id={field.id}
                          required={field.required}
                          className="select"
                          value={form[field.id] || ''}
                          onChange={e => handleChange(field.id, e.target.value)}
                        >
                          <option value="">Select one...</option>
                          {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input
                          type={field.type}
                          id={field.id}
                          required={field.required}
                          className="input"
                          value={form[field.id] || ''}
                          onChange={e => handleChange(field.id, e.target.value)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="bg-slate-100 rounded-xl p-4 text-sm text-slate-600">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" required className="mt-1 accent-brand-600" />
                <span>I understand this is a lead-generation assessment, not the full EasyAI consulting assessment. I consent to EasyAI contacting me about my responses and next steps.</span>
              </label>
            </div>

            <button type="submit" className="btn-primary w-full py-4 text-base">Submit Assessment &#8594;</button>
          </form>
        </div>
      </section>
    </>
  );
}
