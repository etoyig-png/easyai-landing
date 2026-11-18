import type { ChatMessage } from './llm/types';
import { isDirectAssessmentRequest } from './conversationPolicy';
import { isScheduledOfferReply, offersSuspended } from './assessmentCadence';

export interface HistoryBubble {
  role: 'visitor' | 'gary';
  text: string;
}

export const GARY_HISTORY_LIMIT = 80;

/**
 * Rebuilds what a returning visitor should see from the persisted transcript: the messages, the
 * opening shortcut options (only while nothing has been said yet) and whether the latest Gary
 * reply carried the Start Your Journey button. The button rule mirrors the live reply pipeline,
 * so a refresh shows exactly what the visitor saw before it.
 */
export function rebuildConversation(
  rows: { role: string; content: string; optionPayload?: unknown }[],
  completedReplies: number,
): { messages: HistoryBubble[]; options: string[]; offerAssessment: boolean } {
  const visible = rows.filter((row) => row.role === 'gary' || row.role === 'visitor');
  const messages = visible.slice(-GARY_HISTORY_LIMIT).map((row) => ({ role: row.role as 'visitor' | 'gary', text: row.content }));

  const onlyOpening = visible.length === 1 && visible[0].role === 'gary';
  const options = onlyOpening && Array.isArray(visible[0].optionPayload)
    ? (visible[0].optionPayload as unknown[]).filter((item): item is string => typeof item === 'string')
    : [];

  const last = visible.at(-1);
  const lastVisitor = [...visible].reverse().find((row) => row.role === 'visitor');
  let offerAssessment = false;
  if (last?.role === 'gary' && lastVisitor && completedReplies > 0) {
    const history: ChatMessage[] = visible.map((row) => ({ role: row.role === 'visitor' ? 'user' : 'assistant', content: row.content }));
    offerAssessment = isDirectAssessmentRequest(lastVisitor.content)
      || (isScheduledOfferReply(completedReplies) && !offersSuspended(history, isDirectAssessmentRequest));
  }
  return { messages, options, offerAssessment };
}
