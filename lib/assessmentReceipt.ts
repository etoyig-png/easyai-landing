export const ASSESSMENT_RECEIPT_KEY = 'easyai-assessment-receipt-v1';
export type AssessmentReceipt = { id: string; capability: string; storedAt: number };

// A failed cache update must never make a newly accepted assessment use an older receipt.
let discardStoredReceipt = false;

export function readAssessmentReceipt(): AssessmentReceipt | null {
  if (typeof window === 'undefined' || discardStoredReceipt) return null;
  return JSON.parse(window.sessionStorage.getItem(ASSESSMENT_RECEIPT_KEY) ?? 'null');
}

export function storeAssessmentReceipt(receipt: AssessmentReceipt | null): void {
  if (typeof window === 'undefined') return;
  discardStoredReceipt = true;
  try {
    if (receipt) window.sessionStorage.setItem(ASSESSMENT_RECEIPT_KEY, JSON.stringify(receipt));
    else window.sessionStorage.removeItem(ASSESSMENT_RECEIPT_KEY);
    discardStoredReceipt = false;
  } catch {
    try { window.sessionStorage.removeItem(ASSESSMENT_RECEIPT_KEY); }
    catch {
      try { window.sessionStorage.setItem(ASSESSMENT_RECEIPT_KEY, 'null'); }
      catch { /* Keep the current-runtime discard mask when storage cannot be changed. */ }
    }
  }
}
