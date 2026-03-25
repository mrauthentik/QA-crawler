CREATE TABLE IF NOT EXISTS test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  score INTEGER,
  grade TEXT,
  summary TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES test_runs(id) ON DELETE CASCADE,
  test_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  duration INTEGER NOT NULL,
  screenshot TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES test_runs(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  position INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_test_results_run_id ON test_results(run_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_status ON test_runs(status);

-- Add findings column to store WHAT/WHY/FIX analysis
ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS findings JSONB DEFAULT '[]';

-- Tie runs to users
ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS user_id UUID;
CREATE INDEX IF NOT EXISTS idx_test_runs_user_id ON test_runs(user_id);

-- Run visibility
ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Store multi-page crawl metadata
ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS crawled_pages JSONB DEFAULT '[]';

-- Store optional auth credentials for authenticated crawling
ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS auth_email TEXT;
ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS auth_login_url TEXT;
