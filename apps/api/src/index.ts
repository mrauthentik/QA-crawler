import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(__dirname, '../../.env') });

import express from 'express';
import helmet from 'helmet';
import fs from 'fs';
import path from 'path';
import { initDb } from './db/index';
import runsRouter from './routes/runs';
import { apiLimiter, runCreationLimiter } from './middleware/rateLimit';

const app = express();
export { app };

const PORT = process.env.PORT || process.env.API_PORT || 3001;
const SCREENSHOTS_DIR = process.env.SCREENSHOTS_DIR || path.join(__dirname, '../../screenshots');

async function start() {
  try {
    // ─── Security headers ──────────────────────────────────────────────────────
    app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'https:'],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      frameguard: { action: 'deny' },
      xssFilter: true,
      noSniff: true,
    }));

    // ─── CORS ──────────────────────────────────────────────────────────────────
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, PATCH, OPTIONS');
      if (req.method === 'OPTIONS') return res.sendStatus(204);
      next();
    });

    // ─── Body parsing ──────────────────────────────────────────────────────────
    app.use(express.json());

    // ─── Screenshots ───────────────────────────────────────────────────────────
    if (!fs.existsSync(SCREENSHOTS_DIR)) {
      fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
      console.log('📸 Screenshots directory created:', SCREENSHOTS_DIR);
    }
    app.use('/screenshots', express.static(SCREENSHOTS_DIR));

    // ─── Rate limiting ─────────────────────────────────────────────────────────
    app.use('/api', apiLimiter);
    // Run creation limiter applied only in the router on POST

    // ─── Health check ──────────────────────────────────────────────────────────
    app.get('/health', (_req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // ─── Routes ────────────────────────────────────────────────────────────────
    app.use('/api/runs', runsRouter);

    // ─── Database ──────────────────────────────────────────────────────────────
    await initDb();

    // ─── Worker (in-process) ───────────────────────────────────────────────────
    require('./workers/pipeline.worker');

    app.listen(PORT, () => {
      console.log('\n╔══════════════════════════════════════════════╗');
      console.log('║      🕵️  QA Detective API — Started            ║');
      console.log('╚══════════════════════════════════════════════╝');
      console.log(`\n🚀 API running at http://localhost:${PORT}`);
      console.log(`❤️  Health:    http://localhost:${PORT}/health`);
      console.log(`📋 Runs:      http://localhost:${PORT}/api/runs`);
      console.log('\n👷 Pipeline worker running — ready for jobs\n');
    });
  } catch (err) {
    console.error('❌ Failed to start:', err);
    process.exit(1);
  }
}

start();
