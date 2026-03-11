import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(__dirname, '../../.env') });

import express from 'express';
import fs from 'fs';
import path from 'path';
import { initDb } from './db/index';
import runsRouter from './routes/runs';
import { pipelineWorker } from './workers/pipeline.worker';

const app = express();
export { app };
const PORT = process.env.API_PORT || 3001;

app.use(express.json());

// Screenshots — create dir and serve as static files
const SCREENSHOTS_DIR = path.join(__dirname, '../../screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  console.log('📸 Screenshots directory created:', SCREENSHOTS_DIR);
}
app.use('/screenshots', express.static(SCREENSHOTS_DIR));

// CORS for dashboard
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Routes
app.use('/api/runs', runsRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'qa-detective-api',
    version: '0.1.0',
    worker: pipelineWorker.isRunning() ? 'running' : 'stopped',
  });
});

async function start() {
  try {
    // Start Docker services reminder
    console.log('🔌 Connecting to database...');
    await initDb();

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
    console.error('\n💡 Make sure Docker is running:');
    console.error('   docker compose -f infra/docker-compose.yml up -d\n');
    process.exit(1);
  }
}

start();
