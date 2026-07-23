import Link from 'next/link';

const links = {
  Services: [
    { label: 'How It Works', href: '/how-it-works' },
    { label: 'AI Product Consulting', href: '/ai-product-consulting' },
    { label: 'Implementation & Custom Agents', href: '/implementation' },
    { label: 'AI Trust & Human Control', href: '/ai-trust' },
  ],
  Company: [
    { label: 'About EasyAI', href: '/about' },
    { label: 'Resources', href: '/resources' },
    { label: 'Book a Consultation', href: '/book-consultation' },
    { label: 'Contact', href: '/contact' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/privacy#terms' },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div>
            <Link href="/" className="flex items-center gap-2 font-bold text-xl text-white mb-3">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-brand-600 text-white text-sm font-bold">E</span>
              EasyAI
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed">
              AI product consulting and implementation for businesses that want real results, not AI hype.
            </p>
            <p className="text-sm text-slate-400 mt-3">Tampa, FL &nbsp;·&nbsp; Serving clients remotely</p>
          </div>
          {Object.entries(links).map(([group, items]) => (
            <div key={group}>
              <h3 className="text-white font-semibold text-sm mb-4">{group}</h3>
              <ul className="space-y-2">
                {items.map(item => (
                  <li key={item.href}>
                    <Link href={item.href} className="text-sm text-slate-400 hover:text-white transition-colors">{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} EasyAI. All rights reserved.</p>
          <p>Every recommendation is reviewed by a human before delivery.</p>
        </div>
      </div>
    </footer>
  );
}
