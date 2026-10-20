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
  CUSTOMER_DISCOVERY_OPTIONS,
  SEARCH_VISIBILITY_OPTIONS,
  WEBSITE_ACTION_OPTIONS,
  RESPONSE_SPEED_OPTIONS,
  MISSED_CALLS_OPTIONS,
  FOLLOW_UP_OPTIONS,
  SENSITIVE_INFO_OPTIONS,
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

    // Customer-growth questions. Optional on purpose: the browser form always sends all of
    // them, but keeping them optional means an in-flight submission from a cached older page
    // still succeeds instead of 400-ing at the exact moment of a deploy. A missing answer
    // simply narrows what the result can say, it never loses the lead.
    customerDiscovery: z.enum(CUSTOMER_DISCOVERY_OPTIONS).optional(),
    searchVisibility: z.enum(SEARCH_VISIBILITY_OPTIONS).optional(),
    websiteAction: z.enum(WEBSITE_ACTION_OPTIONS).optional(),
    responseSpeed: z.enum(RESPONSE_SPEED_OPTIONS).optional(),
    missedCalls: z.enum(MISSED_CALLS_OPTIONS).optional(),
    followUpConsistency: z.enum(FOLLOW_UP_OPTIONS).optional(),
    sensitiveInfo: z.enum(SENSITIVE_INFO_OPTIONS).optional(),

    sportsFan: z.enum(SPORTS_OPTIONS),

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
  });

export type AssessmentSubmission = z.infer<typeof assessmentSubmissionSchema>;
