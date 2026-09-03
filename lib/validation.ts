import { z } from 'zod';
import {
  WORK_SITUATION_OPTIONS,
  USING_AI_TOOLS_OPTIONS,
  AI_CHALLENGE_OPTIONS,
  DESIRED_OUTCOME_OPTIONS,
  TIME_DRAIN_OPTIONS,
  PRIVACY_CONCERN_OPTIONS,
  INDUSTRY_OPTIONS,
  LEAD_RESPONSE_OPTIONS,
  SPORTS_OPTIONS,
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
    leadResponse: z.enum(LEAD_RESPONSE_OPTIONS),
    sportsFan: z.enum(SPORTS_OPTIONS),
    favoriteTeam: z.string().trim().max(100).optional(),

    firstName: z.string().trim().min(1, 'First name is required').max(100),
    lastName: z.string().trim().min(1, 'Last name is required').max(100),
    businessName: z.string().trim().min(1, 'Business name is required').max(200),
    email: z.string().trim().email('Enter a valid email').max(320),
    websiteUrl: z.string().trim().max(2048).optional(),
    noWebsite: z.boolean(),

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
  .superRefine((data, ctx) => {
    if (data.industry === 'Something else' && !data.industryOther?.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Please tell us what kind of business you run', path: ['industryOther'] });
    }

    const followsSports = data.sportsFan === 'Football' || data.sportsFan === 'Basketball';
    if (followsSports && !data.favoriteTeam?.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Please enter your favorite team', path: ['favoriteTeam'] });
    } else if (!followsSports && data.favoriteTeam) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Favorite team is only accepted for Football or Basketball', path: ['favoriteTeam'] });
    }

    if (data.noWebsite) {
      if (data.websiteUrl) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Remove the website URL when selecting no website', path: ['websiteUrl'] });
      return;
    }

    if (!data.websiteUrl) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a website URL or select no website', path: ['websiteUrl'] });
      return;
    }
    try {
      const url = new URL(data.websiteUrl);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Unsupported protocol');
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Website URL must use http:// or https://', path: ['websiteUrl'] });
    }
  });

export type AssessmentSubmission = z.infer<typeof assessmentSubmissionSchema>;
