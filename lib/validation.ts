import { z } from 'zod';
import {
  WORK_SITUATION_OPTIONS,
  USING_AI_TOOLS_OPTIONS,
  AI_CHALLENGE_OPTIONS,
  DESIRED_OUTCOME_OPTIONS,
  TIME_DRAIN_OPTIONS,
  PRIVACY_CONCERN_OPTIONS,
  INDUSTRY_OPTIONS,
  SPORTS_OPTIONS,
  LEAD_RESPONSE_OPTIONS,
} from './quizQuestions';

export const assessmentSubmissionSchema = z
  .object({
    workSituation: z.enum(WORK_SITUATION_OPTIONS),
    usingAiTools: z.enum(USING_AI_TOOLS_OPTIONS),
    aiChallenge: z.enum(AI_CHALLENGE_OPTIONS),
    desiredOutcome: z.enum(DESIRED_OUTCOME_OPTIONS),
    timeDrain: z.enum(TIME_DRAIN_OPTIONS),
    privacyConcern: z.enum(PRIVACY_CONCERN_OPTIONS),
    industry: z.enum(INDUSTRY_OPTIONS),
    industryOther: z.string().trim().max(200).optional(),

    // Lead-response diagnostic. Optional so an in-flight submission from a cached older page
    // still succeeds during a deploy rather than 400-ing; a missing answer narrows what the
    // email can say but never loses the lead.
    leadResponse: z.enum(LEAD_RESPONSE_OPTIONS).optional(),

    // Sports write-in, used only for consultation rapport. Required when a sport was chosen,
    // enforced by the refine below. Never referenced in the generated Action Plan.
    favoriteTeam: z.string().trim().max(120).optional(),

    sportsFan: z.enum(SPORTS_OPTIONS),

    // Website: either a valid http(s) URL or an explicit "no website" declaration. Restricted to
    // http/https so a submitted value can never be a javascript:, data: or file: URL, and length
    // capped so it cannot be used to smuggle a large payload into the prompt or the email.
    websiteUrl: z
      .string()
      .trim()
      .max(300)
      .url('Enter a valid website address')
      .refine((value) => /^https?:\/\//i.test(value), 'Website must start with http:// or https://')
      .optional(),
    noWebsite: z.boolean().optional(),

    firstName: z.string().trim().min(1, 'First name is required').max(100),
    lastName: z.string().trim().min(1, 'Last name is required').max(100),
    businessName: z.string().trim().min(1, 'Business name is required').max(200),
    email: z.string().trim().email('Enter a valid email').max(320),

    // Set only when this submission arrived via a Gary handoff — correlates this submission
    // back to the originating PublicChatSession without exposing chat contents here.
    funnelCorrelationId: z.string().trim().max(200).optional(),

    consent: z.literal(true, {
      errorMap: () => ({ message: 'You must agree to be contacted to continue' }),
    }),

    // Spam protection — honeypot must stay empty, real users never see this field
    companyUrl: z.string().max(0).optional().or(z.literal('')),
    // Timestamp (ms epoch) the quiz was first rendered — used for a minimum-fill-time check
    formLoadedAt: z.number().positive(),
  })
  .refine((data) => data.industry !== 'Something else' || !!data.industryOther?.length, {
    message: 'Please tell us what kind of business you run',
    path: ['industryOther'],
  })
  // A website answer is required one way or the other: a real URL, or an explicit statement that
  // there isn't one. Leaving both blank is not a valid submission.
  .refine((data) => data.noWebsite === true || !!data.websiteUrl, {
    message: 'Enter your website address, or select that you do not have one',
    path: ['websiteUrl'],
  })
  // A favorite team is required only when a sport was actually chosen.
  .refine((data) => data.sportsFan === 'Not really a sports fan' || !!data.favoriteTeam?.length, {
    message: 'Let us know your favorite team',
    path: ['favoriteTeam'],
  });

export type AssessmentSubmission = z.infer<typeof assessmentSubmissionSchema>;
