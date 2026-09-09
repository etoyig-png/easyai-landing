import { z } from 'zod';

/**
 * Contact-form submission. Deliberately mirrors the assessment schema's shape: bounded
 * strings, a real email check, the same honeypot plus fill-timing pair, so the existing
 * looksLikeSpam() helper can be reused without a second anti-bot mechanism.
 *
 * Phone and business name are optional because the form asks for them only as a convenience.
 */
export const contactSubmissionSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  email: z.string().trim().email('Enter a valid email').max(320),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  businessName: z.string().trim().max(200).optional().or(z.literal('')),
  message: z.string().trim().min(1, 'Message is required').max(4000),

  // Honeypot. Bounded but NOT required to be empty here on purpose: rejecting a filled
  // honeypot at the schema would answer a bot with a 400 and tell it exactly what tripped.
  // looksLikeSpam() consumes it instead, and the route answers with a plain success.
  companyUrl: z.string().max(200).optional(),
  formLoadedAt: z.number().positive(),
});

export type ContactSubmission = z.infer<typeof contactSubmissionSchema>;
