# 📸 Snapshot Testing for QA Detective

## Overview

Snapshot testing in QA Detective allows you to capture baseline security scan results and automatically detect regressions or changes on subsequent scans. This is powerful for:

- **Regression Detection**: Catch when security posture degrades
- **Continuous Monitoring**: Track changes across deployments
- **CI/CD Integration**: Fail builds if security regressions detected
- **Compliance Tracking**: Maintain audit trail of security findings

---

## Quick Start

### 1. Create a Baseline Snapshot

```bash
qa-detective scan https://myapp.com --snapshot
```

This will:
- Perform a security scan
- Save results to `.qa-snapshots/` directory
- Create a snapshot file named after the domain (e.g., `myapp-a1b2c3d4.json`)

**Output:**
```
✅ Snapshot saved to .qa-snapshots/myapp-a1b2c3d4.json
```

### 2. Run Scan and Check Against Baseline

```bash
qa-detective scan https://myapp.com
```

By default, this will:
- Perform the scan
- Compare against saved snapshot
- Show if results match baseline
- Highlight any changes detected

**Output (No Changes):**
```
📸 ✅ Results match baseline snapshot (Apr 22, 2026 10:30:45 AM)
```

**Output (Changes Detected):**
```
📸 ⚠️ Results differ from baseline! 2 field(s) changed.

Changes detected:
  • score
  • failed
  
  Run with --snapshot to update baseline
```

### 3. Show Detailed Changes

```bash
qa-detective scan https://myapp.com --snapshot-verbose
```

**Output:**
```
📸 ⚠️ Results differ from baseline! 2 field(s) changed.

Changes detected:
  • score
    Previous: 95
    Current:  85
  • failed
    Previous: 1
    Current:  3
  
  Run with --snapshot to update baseline
```

### 4. Update Baseline

```bash
qa-detective scan https://myapp.com --snapshot
```

This saves the new results as the baseline (only if intentional changes).

---

## Commands

### Snapshot Options (with `scan` command)

| Option | Description | Example |
|--------|-------------|---------|
| `--snapshot` | Save results as baseline | `qa-detective scan https://app.com --snapshot` |
| `--check-snapshot` | Check against baseline (default: enabled) | `qa-detective scan https://app.com` |
| `--snapshot-dir <dir>` | Custom snapshot directory | `qa-detective scan https://app.com --snapshot-dir ./my-snapshots` |
| `--snapshot-verbose` | Show detailed changes | `qa-detective scan https://app.com --snapshot-verbose` |

### Snapshot Management Commands

#### List all snapshots
```bash
qa-detective snapshot list
```

**Output:**
```
📸 Stored Snapshots:

1. https://myapp.com
   File: myapp-a1b2c3d4.json
   Date: Apr 22, 2026 10:30:45 AM

2. https://api.myapp.com
   File: api-myapp-e5f6g7h8.json
   Date: Apr 20, 2026 3:15:22 PM
```

#### Delete a specific snapshot
```bash
qa-detective snapshot delete --url https://myapp.com
```

**Output:**
```
✅ Snapshot deleted for https://myapp.com
```

#### Delete all snapshots
```bash
qa-detective snapshot clear
```

**Output:**
```
✅ Deleted 2 snapshot(s)
```

---

## What Gets Compared

Snapshots capture and compare:

```json
{
  "grade": "A",
  "score": 95,
  "summary": "Good security posture",
  "passed": 15,
  "failed": 2,
  "findings": [
    {
      "id": "SEC-001",
      "name": "Mixed Content",
      "severity": "high",
      "status": "failed"
    }
  ]
}
```

On subsequent scans, these fields are normalized and compared:
- ✅ Grade and Score
- ✅ Summary
- ✅ Pass/Fail counts
- ✅ Individual findings (order-independent)
- ✅ Severity levels

---

## Use Cases

### CI/CD Integration

Fail build if security degrades:

```bash
qa-detective scan https://staging.myapp.com --check-snapshot --fail-on critical
```

**In GitHub Actions:**

```yaml
- name: Security Regression Check
  run: |
    qa-detective scan https://staging.myapp.com
    if [ $? -ne 0 ]; then
      echo "Security regression detected!"
      exit 1
    fi
```

### Pre-Release Verification

```bash
# Create baseline before release
qa-detective scan https://myapp.com --snapshot

# After deployment, verify nothing changed
qa-detective scan https://prod.myapp.com --snapshot-verbose
```

### Monitoring Multiple URLs

```bash
# Create baselines for multiple services
qa-detective scan https://app.mycompany.com --snapshot
qa-detective scan https://api.mycompany.com --snapshot
qa-detective scan https://dashboard.mycompany.com --snapshot

# Later: check all in one go
qa-detective scan https://app.mycompany.com
qa-detective scan https://api.mycompany.com
qa-detective scan https://dashboard.mycompany.com

# View all snapshots
qa-detective snapshot list
```

### Authenticated Scans

```bash
# Create baseline with authentication
qa-detective scan https://myapp.com --auth-email user@example.com --auth-password pass123 --snapshot

# Check in future
qa-detective scan https://myapp.com --auth-email user@example.com --auth-password pass123
```

---

## Snapshot File Structure

Snapshots are stored as JSON in `.qa-snapshots/` directory:

```bash
.qa-snapshots/
├── myapp-a1b2c3d4.json
├── api-myapp-e5f6g7h8.json
└── dashboard-i9j0k1l2.json
```

**File Format:**

```json
{
  "url": "https://myapp.com",
  "timestamp": "2026-04-22T10:30:45.123Z",
  "result": {
    "grade": "A",
    "score": 95,
    "summary": "Good security posture",
    "passed": 15,
    "failed": 2,
    "findings": [
      {
        "id": "SEC-001",
        "name": "Mixed Content",
        "severity": "high",
        "status": "failed"
      }
    ]
  }
}
```

---

## Best Practices

### ✅ DO

- **Commit snapshots to git** - They're part of your project history
- **Review snapshot changes** - Check diffs before updating
- **Use in CI/CD** - Catch regressions early
- **Test authentication flows** - Use `--auth-email` and `--auth-password`
- **Use custom snapshot directories** - Organize by environment

### ❌ DON'T

- **Update snapshots without review** - Check the changes first
- **Share snapshots across environments** - Each has different baselines
- **Ignore regression warnings** - They indicate real security issues
- **Use production snapshots locally** - Use staging/dev baselines

---

## Troubleshooting

### Snapshot Not Found

**Error:**
```
ℹ️ No baseline snapshot found. Use --snapshot to create one.
```

**Solution:**
Create a baseline first:
```bash
qa-detective scan https://myapp.com --snapshot
```

### Too Many Changes

**Error:**
```
⚠️ Results differ from baseline! 15 field(s) changed.
```

**Solution:**
Review changes with verbose output:
```bash
qa-detective scan https://myapp.com --snapshot-verbose
```

If changes are intentional, update baseline:
```bash
qa-detective scan https://myapp.com --snapshot
```

### Custom Snapshot Directory

Store snapshots elsewhere:

```bash
# Create baseline in custom location
qa-detective scan https://myapp.com --snapshot --snapshot-dir ./security-snapshots

# Check against custom location
qa-detective scan https://myapp.com --snapshot-dir ./security-snapshots

# List snapshots from custom location
qa-detective snapshot list --snapshot-dir ./security-snapshots
```

### Delete Specific Snapshot

```bash
qa-detective snapshot delete --url https://myapp.com
```

### Clear All Snapshots

```bash
qa-detective snapshot clear
```

---

## Complete Example: Production Workflow

```bash
# 1. Create baseline before release
qa-detective scan https://myapp.com \
  --auth-email admin@myapp.com \
  --auth-password SecurePass123 \
  --snapshot

# 2. Deploy code

# 3. Verify security posture
qa-detective scan https://myapp.com \
  --auth-email admin@myapp.com \
  --auth-password SecurePass123 \
  --snapshot-verbose

# 4. If OK, continue. If changes, investigate:
qa-detective scan https://myapp.com \
  --auth-email admin@myapp.com \
  --auth-password SecurePass123 \
  --snapshot-verbose

# 5. Once resolved, update baseline:
qa-detective scan https://myapp.com \
  --auth-email admin@myapp.com \
  --auth-password SecurePass123 \
  --snapshot

# 6. View all monitored URLs
qa-detective snapshot list
```

---

## Integration with Git

Store snapshots in your repository:

```bash
# Add to git
git add .qa-snapshots/

# Review changes
git diff .qa-snapshots/

# Commit when intentional
git commit -m "Update security baseline after patching vulnerabilities"
```

---

## Environment Separation

Use different snapshot directories per environment:

```bash
# Development
qa-detective scan http://localhost:3000 --snapshot --snapshot-dir ./.snapshots/dev

# Staging
qa-detective scan https://staging.myapp.com --snapshot --snapshot-dir ./.snapshots/staging

# Production
qa-detective scan https://myapp.com --snapshot --snapshot-dir ./.snapshots/prod
```

---

## Monitoring Script

```bash
#!/bin/bash

# Monitor security across multiple services
SERVICES=(
  "https://app.mycompany.com"
  "https://api.mycompany.com"
  "https://dashboard.mycompany.com"
)

for service in "${SERVICES[@]}"; do
  echo "Checking $service..."
  qa-detective scan $service --snapshot-verbose
  echo ""
done
```

---

## API Integration

For programmatic access, use the SnapshotManager class:

```typescript
import { SnapshotManager } from 'qa-detective-cli';

const manager = new SnapshotManager('.qa-snapshots');

// Save snapshot
const saveResult = manager.saveSnapshot('https://myapp.com', scanResult);
console.log(saveResult.message);

// Check snapshot
const checkResult = manager.checkSnapshot('https://myapp.com', scanResult);
console.log(checkResult.message);
if (checkResult.changes) {
  console.log('Changes detected:', checkResult.changes);
}

// List all
const snapshots = manager.listSnapshots();
console.log(snapshots);

// Delete
manager.deleteSnapshot('https://myapp.com');
```

---

## FAQ

**Q: How often should I update snapshots?**
A: Update after intentional changes (patches, new features). Review each update carefully.

**Q: Can I compare across environments?**
A: No. Each environment has its own baseline. Use separate snapshot directories.

**Q: What if I have multiple users scanning the same URL?**
A: They'll share the same snapshot. Recommended for CI/CD only.

**Q: Can snapshots be automated?**
A: Yes! Use in CI/CD pipelines with automated comparison.

**Q: How do I handle flaky findings?**
A: Review changes with `--snapshot-verbose`. If false positive, update baseline.

---

## Next Steps

- Add snapshots to `.gitignore` if they contain sensitive data
- Integrate into CI/CD pipeline with `--check-snapshot` flag
- Set up automated monitoring with cron jobs
- Review snapshots monthly for security trends

