import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config, validateConfig } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import problemsRoutes from './routes/problems.routes.js';
import contestsRoutes from './routes/contests.routes.js';
import profileRoutes from './routes/profile.routes.js';
import locationsRoutes from './routes/locations.routes.js';
import submissionsRoutes from './routes/submissions.routes.js';
import { UPLOADS_ROOT } from './lib/avatarStorage.js';
import { errorHandler } from './middleware/errorHandler.js';
import adminRoutes from './routes/admin.routes.js';
import leaderboardRoutes from './routes/leaderboard.routes.js';
// ...

const app = express();

// Validate configuration on startup
const configErrors = validateConfig();
if (configErrors.length > 0) {
  console.error('Configuration errors:');
  configErrors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}

// Middleware configuration
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());


// CORS configuration (supports Vercel testing deployment + local dev + env overrides)
const allowedOrigins = [
  config.frontendUrl,
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
  'https://competitive-pirates-test.vercel.app',
  'http://localhost:3000',
]
  .filter(Boolean)
  .map((origin) => String(origin).trim().replace(/\/+$/, ''));

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Static uploads (avatars)
app.use(
  '/uploads',
  express.static(UPLOADS_ROOT, {
    maxAge: '7d',
    setHeaders: (res) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  })
);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/problems', problemsRoutes);
app.use('/api/contests', contestsRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/submissions', submissionsRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint (database connectivity)
app.get('/api/health', async (req, res) => {
  try {
    const { prisma } = await import('./lib/prisma.js');
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'healthy', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'unhealthy', database: 'disconnected' });
  }
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'API endpoint not found',
    },
  });
});

// JSON 404 handler for non-API routes
app.use('/', (req, res) => {
  res.status(404).json({ error: { message: 'Not found' } });
});

// Centralized error handling
app.use(errorHandler);

export default app;