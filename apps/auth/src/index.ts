import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(__dirname, '../../../.env') });

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import { initDb } from './db/index';
import authRouter from './routes/auth';
import oauthRouter from './routes/oauth';

const app = express();
const PORT = process.env.PORT || process.env.AUTH_PORT || 3002;
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://localhost:3000';
const ALLOWED_ORIGINS = [
  DASHBOARD_URL,
  'http://localhost:3000',
  'http://localhost:3001',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// Routes
app.use('/auth', authRouter);
app.use('/auth', oauthRouter);

// Health
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'qa-detective-auth', version: '0.1.0' });
});

async function start() {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log('\n╔══════════════════════════════════════════════╗');
      console.log('║      🔐 QA Detective Auth — Started           ║');
      console.log('╚══════════════════════════════════════════════╝');
      console.log(`\n🚀 Auth service: http://localhost:${PORT}`);
      console.log(`❤️  Health:       http://localhost:${PORT}/health`);
      console.log(`🔑 Login:         http://localhost:${PORT}/auth/login`);
      console.log(`🌐 Google OAuth:  http://localhost:${PORT}/auth/google\n`);
    });
  } catch (err) {
    console.error('❌ Failed to start auth service:', err);
    process.exit(1);
  }
}

start();
