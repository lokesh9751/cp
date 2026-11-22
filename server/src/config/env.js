import dotenv from 'dotenv';
import { resolve } from 'path';

// Calculate the correct path to .env from the project root (where this file is located)
const envPath = resolve(process.cwd(), 'server/.env');
dotenv.config({ path: envPath });

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 4000,
  databaseUrl: process.env.DATABASE_URL,
  databaseUrlUnpooled: process.env.DATABASE_URL_UNPOOLED,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  judge0ApiUrl: process.env.JUDGE0_API_URL || 'https://ce.judge0.com',
  judge0ApiHost: process.env.JUDGE0_API_HOST || '',
  judge0ApiKey: process.env.JUDGE0_API_KEY || '',
};

// Validate required configuration
export function validateConfig() {
  const errors = [];

  if (!config.databaseUrl) {
    errors.push('DATABASE_URL is required');
  }

  if (!config.databaseUrlUnpooled) {
    errors.push('DATABASE_URL_UNPOOLED is required');
  }

  if (!config.jwtAccessSecret) {
    errors.push('JWT_ACCESS_SECRET is required');
  }

  if (!config.jwtRefreshSecret) {
    errors.push('JWT_REFRESH_SECRET is required');
  }

  return errors;
}