import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Privacy & Terms' };

export default function PrivacyPage() {
  return (
    <>
      <section className="bg-slate-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h1 className="text-4xl font-bold mb-2">Privacy &amp; Terms</h1>
          <p className="text-slate-400">Last updated: 2024</p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 prose prose-slate max-w-none">
          <div className="space-y-10 text-slate-700 leading-relaxed">

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Privacy Policy</h2>
              <p className="mb-4">EasyAI ("we," "us," or "our") operates easyaiconsult.com. This policy explains what information we collect, how we use it, and your rights regarding it.</p>

              <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-2">Information we collect</h3>
              <p className="mb-2">We collect information you provide directly, including:</p>
              <ul className="list-disc ml-6 space-y-1 text-sm mb-4">
                <li>Assessment form responses (business information, contact details, tool usage, goals)</li>
                <li>Contact form submissions (name, email, message)</li>
                <li>Consultation recordings (with your explicit consent)</li>
                <li>Information shared during consultation calls</li>
              </ul>
              <p className="text-sm">We also collect standard analytics data (page views, session duration, referral source) via privacy-respecting analytics if enabled.</p>

              <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-2">How we use your information</h3>
              <ul className="list-disc ml-6 space-y-1 text-sm mb-4">
                <li>To prepare for and conduct your consultation</li>
                <li>To deliver assessment reports and recommendations</li>
                <li>To follow up about your consultation or inquiry</li>
                <li>To improve our services</li>
              </ul>
              <p className="text-sm">We do not sell your information. We do not add you to marketing lists without your permission.</p>

              <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-2">Data storage and security</h3>
              <p className="text-sm mb-4">We store your information using standard business tools (email, cloud storage, CRM if applicable). We use reasonable security practices appropriate to the sensitivity of the data.</p>

              <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-2">Your rights</h3>
              <p className="text-sm mb-4">You may request access to, correction of, or deletion of your information by contacting us. We will respond within a reasonable time.</p>

              <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-2">AI use disclosure</h3>
              <p className="text-sm mb-4">EasyAI uses AI tools to transcribe consultation recordings, analyze assessment responses, and draft findings. All AI-generated content is reviewed by a human before it is used in a recommendation or delivered to a client. We do not use your data to train AI models.</p>

              <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-2">Contact for privacy matters</h3>
              <p className="text-sm">For privacy questions or data requests, contact us via the <a href="/contact" className="text-brand-600 underline">contact page</a>.</p>
            </div>

            <hr className="border-slate-200" />

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Terms of Service</h2>
              <p className="mb-4 text-sm">By using this website and engaging EasyAI's services, you agree to the following terms.</p>

              <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-2">Services</h3>
              <p className="text-sm mb-4">EasyAI provides AI product consulting and implementation services. Service scope, deliverables, and pricing are defined in individual agreements between EasyAI and each client. These terms apply to use of this website and initial engagement activities (assessment, consultation booking).</p>

              <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-2">No guarantees</h3>
              <p className="text-sm mb-4">EasyAI provides research, analysis, and recommendations based on information you provide. We do not guarantee specific business outcomes, revenue increases, cost savings, or productivity improvements. Results depend on implementation quality, team adoption, and factors outside our control.</p>

              <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-2">Assessment and consultation content</h3>
              <p className="text-sm mb-4">Information you submit via the assessment form or consultation is used to prepare and deliver recommendations. Recommendations are general professional opinions based on available information -- they are not legal, financial, or regulatory advice.</p>

              <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-2">Intellectual property</h3>
              <p className="text-sm mb-4">Assessment reports and recommendations delivered to you are for your business use. You may not resell or redistribute EasyAI deliverables without written permission.</p>

              <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-2">Changes to these terms</h3>
              <p className="text-sm mb-4">We may update these terms from time to time. The date at the top of this page reflects when they were last updated. Continued use of the site after changes constitutes acceptance.</p>

              <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-2">Governing law</h3>
              <p className="text-sm">These terms are governed by the laws of the State of Florida.</p>
            </div>

          </div>
        </div>
      </section>
    </>
  );
}
