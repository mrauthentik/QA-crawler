# 🕵️ QA Detective

> An AI-powered autonomous end-to-end testing system that crawls web applications, generates intelligent test cases, executes them with a real browser, and produces detective-style security and quality reports.

![Status](https://img.shields.io/badge/status-active--development-green)
![Node](https://img.shields.io/badge/node-v20.x-blue)
![TypeScript](https://img.shields.io/badge/typescript-5.x-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Table of Contents

- [What It Does](#what-it-does)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running the System](#running-the-system)
- [API Reference](#api-reference)
- [How the Pipeline Works](#how-the-pipeline-works)
- [Team & Ownership](#team--ownership)
- [Contributing](#contributing)
- [Roadmap](#roadmap)

---

## What It Does

QA Detective takes a URL and a plain-English description of what an application is supposed to do. It then:

1. **Crawls** the entire web application — discovering all pages, links, forms, and console errors
2. **Generates** a comprehensive test plan using AI — covering functional, navigation, performance, and security tests
3. **Executes** every test case using a real headless browser (Playwright)
4. **Reports** findings in a detective-style investigation report — with severity ratings, plain-English explanations, and exact fix instructions

### Example
```bash
POST /api/runs
{
  "url": "https://yourapp.com",
  "description": "A SaaS dashboard where users log in, manage projects, and invite team members."
}
```

Returns a full investigation report scored out of 100 with findings like:
```
🔴 CRITICAL: Missing Content Security Policy header
   WHAT: The app has no CSP header configured
   WHY:  Leaves users vulnerable to XSS attacks
   FIX:  Add Content-Security-Policy: default-src 'self' to your server headers
```

---

## Architecture
```
┌─────────────────────────────────────────────────────┐
│                    Dashboard (Next.js)               │
│         Submit URL → Watch Progress → Read Report    │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP POST /api/runs
┌──────────────────────▼──────────────────────────────┐
│                   API Server (Express)               │
│              Receives requests, queues jobs          │
└──────────────────────┬──────────────────────────────┘
                       │ BullMQ Job Queue
┌──────────────────────▼──────────────────────────────┐
│                 Pipeline Worker                      │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────┐│
│  │ Crawler  │→ │AI Engine │→ │ Executor │→ │Report││
│  │Playwright│  │  Groq    │  │Playwright│  │  AI  ││
│  └──────────┘  └──────────┘  └──────────┘  └──────┘│
└──────────────────────┬──────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
┌───────▼──────┐             ┌────────▼─────┐
│  PostgreSQL  │             │    Redis     │
│  (Results)   │             │   (Queue)    │
└──────────────┘             └──────────────┘
```

### Modular Monolith

The system uses a **modular monolith** architecture — one repository, cleanly separated packages. Each package has a single responsibility and communicates through well-defined TypeScript interfaces.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Language | TypeScript + Node.js | Core engine, API, automation |
| Browser Automation | Playwright | Crawling and test execution |
| AI Layer | Groq API (Llama 3.1) | Test generation and report writing |
| API Framework | Express.js | HTTP server |
| Job Queue | BullMQ + Redis | Async pipeline execution |
| Database | PostgreSQL | Persistent storage of runs and results |
| Frontend | Next.js + React | User dashboard (in development) |
| Monorepo | Turborepo + pnpm | Build orchestration |
| CI/CD | GitHub Actions | Automated testing and deployment |
| Containers | Docker + Compose | Local development services |

---

## Project Structure
```
qa-detective/
├── apps/
│   ├── api/                        # Express API server + pipeline worker
│   │   └── src/
│   │       ├── db/                 # PostgreSQL connection and queries
│   │       │   ├── index.ts
│   │       │   └── schema.sql
│   │       ├── routes/
│   │       │   └── runs.ts         # POST /api/runs, GET /api/runs/:id
│   │       ├── workers/
│   │       │   └── pipeline.worker.ts  # BullMQ worker — runs full pipeline
│   │       └── index.ts            # Entry point
│   │
│   └── dashboard/                  # Next.js frontend (in development)
│
├── packages/
│   ├── crawler/                    # Playwright web crawler
│   │   └── src/index.ts            # crawlPage(url) → CrawlResult
│   │
│   ├── ai-engine/                  # Groq AI test plan generator
│   │   └── src/
│   │       ├── index.ts
│   │       └── planner.ts          # generateTestPlan(description, crawlData) → TestPlan
│   │
│   ├── executor/                   # Playwright test runner
│   │   └── src/
│   │       ├── index.ts            # executeTestPlan(url, cases) → ExecutionResult
│   │       ├── types.ts
│   │       └── runners/
│   │           ├── functional.ts
│   │           ├── navigation.ts
│   │           ├── performance.ts
│   │           └── security.ts
│   │
│   ├── reporter/                   # AI report generator
│   │   └── src/index.ts            # generateReport(results) → DetectiveReport
│   │
│   └── shared/                     # Shared TypeScript types
│       └── src/types/index.ts
│
├── python/                         # Python AI agents (Phase 2)
│   ├── agents/
│   └── security/
│
├── infra/
│   └── docker-compose.yml          # PostgreSQL + Redis for local dev
│
├── docs/
│   ├── architecture.md
│   └── api.md
│
├── .github/
│   └── workflows/                  # CI/CD pipelines
│
├── .env.example                    # Environment variable template
├── pnpm-workspace.yaml             # Monorepo workspace config
└── turbo.json                      # Turborepo build config
```

---

## Getting Started

### Prerequisites

Make sure you have these installed before cloning:

| Tool | Version | Install |
|---|---|---|
| Node.js | v20.x | Via NVM: `nvm install 20` |
| Python | 3.11.x | Via pyenv: `pyenv install 3.11.9` |
| pnpm | 8.x+ | `npm install -g pnpm` |
| Docker Desktop | Latest | docker.com |
| Git | 2.x+ | Pre-installed on most systems |

> **Windows users:** All commands must be run inside **WSL2 (Ubuntu)**. See [WSL Setup Guide](docs/wsl-setup.md).

### Installation
```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/qa-detective.git
cd qa-detective

# 2. Install all dependencies across all packages
pnpm install

# 3. Install Playwright browser binaries
cd packages/crawler && npx playwright install chromium && npx playwright install-deps chromium
cd ../..

# 4. Copy environment variables
cp .env.example .env
# Edit .env and fill in your values — see Environment Variables section
```

### Start Local Services
```bash
# Start PostgreSQL and Redis via Docker
docker compose -f infra/docker-compose.yml --env-file .env up -d

# Verify both are healthy
docker compose -f infra/docker-compose.yml ps
```

### Set Environment Variables

Add these to your shell for local development:
```bash
export DB_PASSWORD=your_password
export DATABASE_URL=postgresql://admin:your_password@localhost:5432/qa_detective
export REDIS_URL=redis://localhost:6379
export GROQ_API_KEY=your_groq_key
export API_PORT=3001
```

Or add them to `~/.bashrc` to persist across sessions.

---

## Environment Variables

| Variable | Required | Description | Where to get it |
|---|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string | Set after Docker starts |
| `DB_PASSWORD` | Yes | PostgreSQL password | Choose your own |
| `REDIS_URL` | Yes | Redis connection string | `redis://localhost:6379` |
| `GROQ_API_KEY` | Yes | Groq AI API key | console.groq.com (free) |
| `API_PORT` | No | API server port (default 3001) | Optional |
| `OLLAMA_URL` | No | Local Ollama URL if using local AI | `http://localhost:11434` |

> **Never commit your `.env` file.** Only `.env.example` is committed to git.

---

## Running the System

### Start the API Server
```bash
cd apps/api
npx tsx src/index.ts
```

You should see:
```
✅ Database initialised
🚀 API running at http://localhost:3001
👷 Pipeline worker running — ready for jobs
```

### Run Individual Packages (for development)
```bash
# Test the crawler alone
cd packages/crawler
npx tsx src/test-crawl.ts

# Test the AI engine alone
cd packages/ai-engine
npx tsx src/test-ai.ts

# Test the executor alone
cd packages/executor
npx tsx src/test-executor.ts

# Run the full pipeline without the API
cd packages/reporter
npx tsx src/test-pipeline.ts
```

---

## API Reference

### Submit a Test Run
```
POST /api/runs
Content-Type: application/json

{
  "url": "https://yourapp.com",
  "description": "Description of what the app is supposed to do"
}
```

**Response (202 Accepted):**
```json
{
  "message": "Test run queued successfully",
  "runId": "410f91a5-4818-40c8-887d-92c7aa440cdd",
  "status": "pending",
  "pollUrl": "/api/runs/410f91a5-4818-40c8-887d-92c7aa440cdd"
}
```

---

### Get Run Results
```
GET /api/runs/:id
```

**Response fields:**

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Unique run identifier |
| `url` | string | Target URL that was tested |
| `status` | string | `pending` / `running` / `completed` / `failed` |
| `score` | integer | Quality score out of 100 |
| `grade` | string | Letter grade (A through F) |
| `summary` | string | AI-written executive summary |
| `results` | array | Individual test case results |
| `recommendations` | array | AI-generated fix recommendations |

---

### Get All Runs
```
GET /api/runs
```

Returns last 50 test runs ordered by most recent.

---

### Health Check
```
GET /health
```

Returns API and worker status.

---

## How the Pipeline Works

When a test run is submitted via the API, this is exactly what happens:
```
1. API receives POST /api/runs
   └── Creates a record in PostgreSQL with status: pending
   └── Pushes job to Redis via BullMQ
   └── Returns runId immediately (non-blocking)

2. Pipeline Worker picks up the job
   └── Updates status: running

3. Crawler (Playwright)
   └── Launches headless Chromium
   └── Visits the target URL
   └── Extracts: all links, all forms, console errors, page title
   └── Returns: CrawlResult

4. AI Engine (Groq — Llama 3.1 8B)
   └── Receives: app description + CrawlResult
   └── Generates: 5–10 structured test cases as JSON
   └── Each test case has: id, name, type, priority, steps, expectedOutcome

5. Executor (Playwright)
   └── Runs each test case based on its type:
       - functional  → checks content, title, error indicators
       - navigation  → validates links, checks for broken URLs
       - performance → measures load time, DOM metrics, resource count
       - security    → checks headers, mixed content, exposed secrets
   └── Captures screenshots on failures
   └── Returns: ExecutionResult with pass/fail per test

6. Reporter (Groq — Llama 3.1 8B)
   └── Calculates score (100 minus weighted deductions by severity)
   └── Sends failed tests to AI for analysis
   └── AI writes: WHAT / WHY / FIX for each finding
   └── Returns: DetectiveReport

7. Results saved to PostgreSQL
   └── Updates test_runs, test_results, recommendations tables
   └── Updates status: completed
```

---

## Team & Ownership

| Area | Owner | Status |
|---|---|---|
| Core Engine (crawler, executor) | TBD | ✅ Built |
| AI Layer (ai-engine, reporter) | TBD | ✅ Built |
| API + Database + Worker | TBD | ✅ Built |
| Dashboard (Next.js) | TBD | 🔄 In Progress |
| Authentication | TBD | ⬜ Not Started |
| Real-time Progress (WebSockets) | TBD | ⬜ Not Started |
| CI/CD + Deployment | TBD | ⬜ Not Started |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Branching strategy
- Commit message conventions
- Pull request process
- Code style guidelines
- How to set up your development environment

---

## Roadmap

### MVP (Current)
- [x] Playwright crawler
- [x] AI test case generation (Groq)
- [x] Test execution engine
- [x] Detective report generation
- [x] REST API with job queue
- [x] PostgreSQL persistence

### v1.0
- [ ] Next.js dashboard
- [ ] User authentication
- [ ] Real-time progress via WebSockets
- [ ] Screenshot viewer in dashboard
- [ ] GitHub Actions CI/CD
- [ ] Production deployment

### v2.0
- [ ] Form submission testing
- [ ] Authentication flow testing
- [ ] Accessibility scanning (axe-core)
- [ ] Load testing (k6)
- [ ] Security scanning (OWASP ZAP)
- [ ] Multi-page deep crawling
- [ ] Scheduled recurring test runs
- [ ] Email/Slack notifications

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

## Scripts

All scripts run from the **root** of the repository.

| Command | What it does |
|---|---|
| `pnpm run type-check` | Type check all packages at once via Turborepo |
| `pnpm run check:all` | Type check + build all packages |
| `pnpm run build` | Build all packages |
| `pnpm run dev` | Start all packages in dev/watch mode |
| `pnpm run lint` | Lint all packages |

### Run a single package only
```bash
pnpm run type-check --filter @qa-detective/executor
pnpm run type-check --filter @qa-detective/crawler
pnpm run type-check --filter @qa-detective/api
```

### Before every PR — run this
```bash
pnpm run type-check
```

All checks must pass before opening a pull request.
