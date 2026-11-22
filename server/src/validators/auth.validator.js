import { z } from 'zod';

// Username: 3-20 characters, lowercase letters, digits, underscore only
export const signupSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, digits, and underscores'),
  email: z.string()
    .trim()
    .email('Please enter a valid email address')
    .transform((val) => val.toLowerCase()),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password is too long')
    .refine((password) => Buffer.from(password).length <= 72, {
      message: 'Password is too long',
    }),
}).strict();

// Login: identifier (email or username) + password
export const loginSchema = z.object({
  identifier: z.string()
    .trim()
    .min(1, 'Identifier is required'),
  password: z.string()
    .min(1, 'Password is required'),
}).strict();

// Token validation
export const refreshTokenSchema = z.object({
  // No body required - refresh token comes from cookie
}).strict();