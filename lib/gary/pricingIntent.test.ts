import { describe, expect, it } from 'vitest';
import { asksGaryPrice } from './pricingReply';
// The 19 pricing questions from the independent live scorecard (18 Nov 2026), verbatim.
const yes = ['What would it cost to set something up?','I mean your evaluation before buying software, rather than a quote for installing it.','Would the deeper evaluation have a fee, and is that reduced if we hire you to build it?','Thanks, I have the button. Before I open it, is Start Your Journey free?','How much do you charge for the assessment and the more detailed review?','Would the detailed evaluation be discounted if we choose Easy AI for implementation?','What is the price for Start Your Journey?','What would I pay for a deeper review before deciding whether to implement anything?','Is the initial assessment free, or will I need a credit card?','What does the detailed evaluation cost if the first assessment is free?','What would it cost to set something up? I know an installation quote depends on scope, but I mean your review first.','How much does your deeper evaluation run, and does hiring your team lower that fee?','How much does it cost?','I mean the evaluation fee, before we commit to software or implementation.','What is the starting price of your detailed evaluation?','If I decide to hire Easy AI after that, would you discount that evaluation?','Is Start Your Journey free even if I do not own a company?','What do you charge?','That is clear. And if I hire Easy AI afterward, is it a discount on the evaluation rather than a promise that implementation is $299?'];
const no = ['What does the assessment cover?','How long does the assessment take?','Will the review help me free up time?','Can you review my website?','We get a lot of bad reviews on Google.','What would it cost me to keep missing calls?','How much time will I save?','Is it free to use a photo editor?','Does the assessment run on my phone?','What is the cost of missing calls?','My costs are rising.','How do I prepare for the assessment?'];
describe('pricing intent from the independent live scorecard', () => {
  it.each(yes)('gets the approved price reply: %s', (question) => {
    expect(asksGaryPrice(question)).toBe(true);
  });
  it.each(no)('is not treated as a pricing question: %s', (question) => {
    expect(asksGaryPrice(question)).toBe(false);
  });
});
