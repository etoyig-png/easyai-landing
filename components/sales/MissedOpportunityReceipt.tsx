import Image from 'next/image';

const receipt = [
  { time: '7:14 AM', what: 'Google: “electrician near me”', result: 'Not listed' },
  { time: '11:02 AM', what: 'AI: “who should I call?”', result: 'Competitor named' },
  { time: '6:48 PM', what: 'Website visit, 2 pages', result: 'Left. No contact' },
  { time: '9:31 PM', what: 'Phone call', result: 'Voicemail' },
];

/** Server-rendered example; SalesMotion starts printing only when this card enters view. */
export default function MissedOpportunityReceipt() {
  return (
    <div className="sx-receipt-stage" data-sales-receipt-trigger aria-label="Example: a day of missed customer opportunities">
      <div className="sx-receipt" data-sales-receipt>
        <div className="sx-receipt-head">
          <Image src="/easy-ai-logo-transparent.png" alt="Easy AI" width={1430} height={290} sizes="120px" />
          <span>MISSED OPPORTUNITY RECEIPT</span>
          <small>Prepared by Gary · Accounting</small>
        </div>
        <ol className="sx-receipt-lines">
          {receipt.map((r, i) => (
            <li key={r.time} style={{ ['--i' as string]: i }}>
              <span className="sx-r-time">{r.time}</span>
              <span className="sx-r-what">{r.what}</span>
              <span className="sx-r-res">{r.result}</span>
            </li>
          ))}
        </ol>
        <div className="sx-receipt-total" style={{ ['--i' as string]: receipt.length }}>
          <span>Customers lost today</span><b>4</b>
        </div>
        <p className="sx-receipt-foot">One example day. Your total is waiting below.</p>
        <div className="sx-receipt-tear" aria-hidden="true" />
      </div>
    </div>
  );
}
