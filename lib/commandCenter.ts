/**
 * Sends a status-only update to the Easy AI Command Center (separate deployment,
 * mr-life-command-center repo — POST /api/easy-ai/leads). Never send full assessment
 * answers here — only event type + submission id. Set COMMAND_CENTER_WEBHOOK_URL to
 * https://<command-center-domain>/api/easy-ai/leads and COMMAND_CENTER_WEBHOOK_SECRET
 * to the same value as that deployment's EASY_AI_LEAD_WEBHOOK_TOKEN.
 */
export async function notifyCommandCenter(event: {
  status: 'assessment_completed' | 'assessment_failed';
  submissionId: string;
}) {
  const url = process.env.COMMAND_CENTER_WEBHOOK_URL;
  const secret = process.env.COMMAND_CENTER_WEBHOOK_SECRET;
  if (!url || !secret) return; // not configured yet — no-op until wired up

  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({
        source: 'easyai-landing',
        event: event.status,
        submissionId: event.submissionId,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch {
    // Best-effort only — a failed status ping should never affect the lead's experience.
  }
}
