import { z } from 'zod';

// Contest slug validation
export const contestSlugSchema = z.object({
  slug: z.string().trim().min(1).max(200),
}).strict();

// Contest reaction body validation
export const contestReactionSchema = z.object({
  reaction: z.enum(['LIKE', 'DISLIKE']),
}).strict();

// Registration body validation (empty body expected)
export const registrationBodySchema = z.object({}).strict();