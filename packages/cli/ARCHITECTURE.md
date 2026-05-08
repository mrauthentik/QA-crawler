# QA Detective - Architecture & Scaling Guide

## System Architecture

```
┌─────────────────┐
│  qa-detective   │ CLI (Node.js)
│      CLI        │ - Tunnel management
└────────┬────────┘ - API communication
         │          - Report generation
         │
    ┌────▼─────────────────────────────────────┐
    │  Tunnel Provider Selection               │
    │  ┌──────────────┐  ┌──────────────┐    │
    │  │ ngrok (1°)   │  │ localtunnel  │    │
    │  │ - Reliable   │  │ - Fallback   │    │
    │  │ - Free tier  │  │ - No setup   │    │
    │  └──────────────┘  └──────────────┘    │
    └────┬─────────────────────────────────────┘
         │
    ┌────▼──────────────────────┐
    │  QA Detective API         │
    │  (Node.js/TypeScript)     │
    │  - Run management         │
    │  - Worker queue           │
    │  - Results storage        │
    └────┬──────────────────────┘
         │
    ┌────┴──────────────────────────────────────┐
    │  Analysis Engines (Parallel Workers)     │
    │  ┌──────────────────────────────────────┐ │
    │  │ Node.js Security Scanner (Default)  │ │
    │  │ - Mixed content, cookies, headers   │ │
    │  │ - CORS, XSS detection               │ │
    │  │ - No Python dependency              │ │
    │  └──────────────────────────────────────┘ │
    │  ┌──────────────────────────────────────┐ │
    │  │ Python Security Agent (Optional)    │ │
    │  │ - Deep security analysis            │ │
    │  │ - Browser automation                │ │
    │  │ - GraphQL introspection             │ │
    │  └──────────────────────────────────────┘ │
    │  ┌──────────────────────────────────────┐ │
    │  │ Performance Engine                  │ │
    │  │ - Lighthouse integration            │ │
    │  │ - Load testing (Artillery)          │ │
    │  └──────────────────────────────────────┘ │
    └─────────────────────────────────────────┘
```

## Tunnel Strategy: Why ngrok + Fallback?

### Problem Solved
- **localtunnel**: Unreliable, frequent connection failures, region-specific issues
- **Direct localhost**: API cannot reach development machine
- **Cloudflare/SSH**: Requires CLI installation and configuration

### Solution: Multi-Provider Strategy

```
┌─────────────────────────────┐
│ User runs CLI with localhost│
└────────────┬────────────────┘
             │
             ▼
      ┌──────────────┐
      │ Try ngrok?   │ ◄─── User has NGROK_AUTHTOKEN
      └──────────────┘
        ✓ yes / ✗ no
        │         │
        ▼         ▼
    [Success]  ┌──────────────────┐
               │ Try localtunnel? │
               └──────────────────┘
                 ✓ yes / ✗ no
                 │         │
                 ▼         ▼
             [Success]   [Fail with guidance]
```

### Why ngrok First?

| Aspect | ngrok | localtunnel | Cloudflare |
|--------|-------|-------------|-----------|
| Reliability | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Speed | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Setup | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Free Tier | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Support | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

**Conclusion**: ngrok best balance of reliability + free tier + support

---

## Python Dependency Strategy

### Current State (Production Ready)

```
┌────────────────────────────────────────┐
│ QA Detective CLI (Node.js only)        │
├────────────────────────────────────────┤
│ Default Flow: ✅ Works without Python  │
│  ├─ Tunnel management (ngrok)          │
│  ├─ API communication                  │
│  ├─ Report generation (PDF/JSON)       │
│  └─ Node.js security scanner           │
│     ├─ Mixed content detection         │
│     ├─ Cookie security flags           │
│     ├─ Security headers check          │
│     ├─ CORS misconfiguration           │
│     ├─ Inline scripts detection        │
│     └─ Console error monitoring        │
│                                        │
│ Optional Python: `--local` flag only   │
│  ├─ Requires Python 3.8+               │
│  ├─ DevTools network monitoring        │
│  ├─ Advanced secret scanning           │
│  ├─ GraphQL introspection check        │
│  └─ Browser automation                 │
└────────────────────────────────────────┘
```

### Why Node.js for Default?

1. **Accessibility**: Single install (node), works everywhere
2. **Dependencies**: No external package management needed
3. **Cross-Platform**: Windows/Mac/Linux without compatibility issues
4. **Performance**: Faster startup, lighter memory footprint
5. **Distribution**: Easy to ship in Docker, CI/CD, npm

### Why Keep Python Optional?

1. **Deep Analysis**: Python has better browser automation libraries
2. **Advanced Checks**: Some security checks need Python-only tools
3. **Flexibility**: Power users can opt-in for more features
4. **Backward Compatibility**: Existing deployments continue to work

---

## Scaling Considerations

### Horizontal Scaling (Multiple Instances)

```
┌─────────────────────────────────────────────────┐
│         QA Detective Load Balancer              │
└────────┬─────────────────┬─────────────────┬────┘
         │                 │                 │
    ┌────▼────┐        ┌───▼───┐        ┌──▼────┐
    │ Instance │        │Instance│        │Instance│
    │    1     │        │   2    │        │   3    │
    └──────────┘        └────────┘        └────────┘
         │                 │                 │
         └─────────────────┴─────────────────┘
                  ▼
         ┌───────────────────┐
         │  Shared API Queue  │
         │  (Redis/RabbitMQ)  │
         └───────────────────┘
                  ▼
    ┌────────────────────────────┐
    │  Shared Result Store       │
    │  (PostgreSQL/MongoDB)      │
    └────────────────────────────┘
```

### Current Limitations to Address

1. **Single API instance**: Railway.app (single dyno)
   - Solution: Add queue system (Bull.js with Redis)
   - Scale: Multiple worker instances processing queue

2. **Tunnel bottleneck**: Each CLI creates own tunnel
   - Solution: Share ngrok tunnels across scans
   - Scale: Tunnel pool manager for high-volume scanning

3. **Stateless workers**: Each scan re-initializes
   - Solution: Cache browser instances (Chromium pool)
   - Scale: Browser pool per worker, timeout rotation

### Recommended Scaling Path

#### Phase 1: Immediate (Current)
- ✅ Single API instance (sufficient for MVP)
- ✅ Stateless CLI (scales horizontally)
- ✅ ngrok tunneling (reliable)
- ✅ Node.js default (minimal dependencies)

#### Phase 2: Medium-Term (10k+ scans/day)
- Add Redis for scan queue
- Implement worker pool (3-5 instances)
- Add results caching layer
- Implement rate limiting per user

#### Phase 3: Large-Scale (100k+ scans/day)
- Distributed job queue (Kubernetes)
- Browser session pooling
- CDN for static reports
- Multi-region tunneling

---

## Node.js vs Python Comparison

### When to Use Node.js (Default)
- Production deployments
- No Python installed on system
- Quick scans (< 10 seconds)
- CI/CD pipelines
- Docker containerization

### When to Use Python (`--local` flag)
- Local development
- Deep security audits
- Custom check development
- Advanced browser automation
- Debugging issues

### Performance Comparison

```
Metric              │ Node.js    │ Python
────────────────────┼────────────┼──────────
Startup time        │ 500ms      │ 2000ms
Memory (idle)       │ 45MB       │ 120MB
Tunnel creation     │ 1.2s       │ 1.2s
Security checks     │ 4.5s       │ 6.2s
Total per scan      │ 7.2s       │ 11.4s
────────────────────┴────────────┴──────────
```

---

## Deployment Strategy

### Local Development
```bash
export NGROK_AUTHTOKEN=your_token
qa-detective scan http://localhost:3000 --local
```

### Docker Production
```dockerfile
FROM node:18-alpine
RUN npm install -g qa-detective-cli
ENV NGROK_AUTHTOKEN=${NGROK_AUTHTOKEN}
ENTRYPOINT ["qa-detective"]
```

### CI/CD
```yaml
- uses: actions/setup-node@v3
- run: npm install -g qa-detective-cli
- env:
    NGROK_AUTHTOKEN: ${{ secrets.NGROK_AUTHTOKEN }}
  run: qa-detective scan https://myapp.com
```

---

## Future Improvements

1. **Tunnel Pooling**: Reuse tunnels across multiple scans
2. **Result Caching**: Cache results for identical URLs
3. **Distributed Tracing**: OpenTelemetry integration
4. **Custom Engines**: Plugin system for custom checks
5. **Real-time Alerts**: WebSocket updates during scans
6. **Batch Scanning**: API to scan multiple URLs in parallel
7. **API Gateway**: Rate limiting, authentication layer
8. **Cloud Storage**: S3/GCS integration for reports
