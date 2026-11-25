import { z } from 'zod';

const gmailSchema = z
  .string()
  .trim()
  .email('Please enter a valid email address')
  .transform((val) => val.toLowerCase())
  .refine((val) => val.endsWith('@gmail.com'), {
    message: 'Only @gmail.com email addresses are allowed',
  });

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password is too long')
  .refine((password) => Buffer.from(password).length <= 72, {
    message: 'Password is too long',
  });

export const signupSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(20, 'Username must be at most 20 characters')
      .regex(/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, digits, and underscores'),
    email: gmailSchema,
    password: passwordSchema,
  })
  .strict();

export const loginSchema = z
  .object({
    identifier: z.string().trim().min(1, 'Identifier is required'),
    password: z.string().min(1, 'Password is required'),
  })
  .strict();

export const googleAuthSchema = z
  .object({
    credential: z.string().min(1, 'Google credential is required'),
  })
  .strict();

export const changeEmailSchema = z
  .object({
    newEmail: gmailSchema,
    currentPassword: z.string().min(1, 'Current password is required'),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
  })
  .strict();

export const deleteAccountSchema = z
  .object({
    confirmText: z.string().refine((v) => v === 'DELETE', {
      message: 'Type DELETE to confirm',
    }),
    password: z.string().optional(),
  })
  .strict();