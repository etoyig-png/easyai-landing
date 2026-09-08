import { z } from 'zod';
import {
  WORK_SITUATION_OPTIONS,
  SEARCH_VISIBILITY_OPTIONS,
  AI_CHALLENGE_OPTIONS,
  DESIRED_OUTCOME_OPTIONS,
  TIME_DRAIN_OPTIONS,
  PRIVACY_CONCERN_OPTIONS,
  INDUSTRY_OPTIONS,
  LEAD_RESPONSE_OPTIONS,
  WEBSITE_CONVERSION_OPTIONS,
} from './quizQuestions';
import { isValidWebsiteUrl } from './websiteAnswer';

export const assessmentSubmissionSchema = z
  .object({
    workSituation: z.enum(WORK_SITUATION_OPTIONS),
    searchVisibility: z.enum(SEARCH_VISIBILITY_OPTIONS),
    aiChallenge: z.enum(AI_CHALLENGE_OPTIONS),
    desiredOutcome: z.enum(DESIRED_OUTCOME_OPTIONS),
    timeDrain: z.enum(TIME_DRAIN_OPTIONS),
    privacyConcern: z.enum(PRIVACY_CONCERN_OPTIONS),
    industry: z.enum(INDUSTRY_OPTIONS),
    industryOther: z.string().trim().max(200).optional(),
    leadResponse: z.enum(LEAD_RESPONSE_OPTIONS),
    websiteConversion: z.enum(WEBSITE_CONVERSION_OPTIONS),

    firstName: z.string().trim().min(1, 'First name is required').max(100),
    lastName: z.string().trim().min(1, 'Last name is required').max(100),
    businessName: z.string().trim().min(1, 'Business name is required').max(200),
    email: z.string().trim().email('Enter a valid email').max(320),
    websiteUrl: z.string().trim().max(2048).optional(),
    noWebsite: z.boolean(),

    // Optional correlation only. Gary remains independent from assessment scoring
    // and result generation.
    funnelCorrelationId: z.string().trim().max(200).optional(),

    consent: z.literal(true, {
      errorMap: () => ({ message: 'You must agree to be contacted to continue' }),
    }),

    companyUrl: z.string().max(0).optional().or(z.literal('')),
    formLoadedAt: z.number().positive(),
  })
  .superRefine((data, ctx) => {
    if (data.industry === 'Something else' && !data.industryOther?.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Please tell us what kind of business you run', path: ['industryOther'] });
    }

    // noWebsite is the single source of truth for whether a URL exists. It is deliberately NOT
    // required to agree with the websiteConversion answer: the owner can answer that question
    // one way and then press "I don't have a website" on the later contact screen, or undo that
    // press and supply a real URL. The earlier cross-field consistency rule rejected both of
    // those, which is what blocked owners without a website from finishing the assessment.
    // Every historical submission still satisfies the rules below, so no migration is needed.
    if (data.noWebsite) {
      if (data.websiteUrl) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Remove the website URL when selecting no website', path: ['websiteUrl'] });
      return;
    }

    if (!data.websiteUrl) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a website URL or select no website', path: ['websiteUrl'] });
      return;
    }
    // URL validation itself is unchanged, and shared with the form via isValidWebsiteUrl.
    if (!isValidWebsiteUrl(data.websiteUrl)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Website URL must use http:// or https://', path: ['websiteUrl'] });
    }
  });

export type AssessmentSubmission = z.infer<typeof assessmentSubmissionSchema>;
