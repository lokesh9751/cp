import { z } from 'zod';
import { ProblemType, Difficulty } from '../constants/enums.js';

// Problem type values: dsa | cp; default all
export const problemTypeValues = ['all', 'dsa', 'cp'];

// Difficulty values: all | easy | medium | hard; default all
export const difficultyValues = ['all', 'easy', 'medium', 'hard'];

// Status values: all | solved | attempted | unsolved; default all
export const statusValues = ['all', 'solved', 'attempted', 'unsolved'];

// Problem list query validation
export const problemsListSchema = z.object({
  type: z.enum(problemTypeValues).optional(),
  search: z.string().trim().max(200).optional(),
  difficulty: z.enum(difficultyValues).optional(),
  topic: z.string().trim().max(100).optional(),
  status: z.enum(statusValues).optional(),
  page: z.coerce.number().int().min(1).max(1000000).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
}).strict();

// Problem slug validation
export const problemSlugSchema = z.object({
  slug: z.string().trim().min(1).max(200),
}).strict();