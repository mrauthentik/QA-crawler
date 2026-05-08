#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { runScan } from './scanRunner';
import { createTunnel, isLocalUrl, extractPort } from './tunnel';
import { SnapshotManager } from './snapshotManager';
import fs from 'fs';
import { generatePdfReport } from './pdfReport';
import {
  loadCredentials,
  saveCredentials,
  clearCredentials,
  getAuthServiceUrl,
  loginInteractive,
} from './auth';

const program = new Command();

program
  .name('qa-detective')
  .description('QA Detective: Scan web apps for security, performance, accessibility, and more.')
  .version('0.1.0')
  .addHelpText('after', `

Examples:
  $ qa-detective scan https://myapp.com
  $ qa-detective scan https://myapp.com --auth-email user@site.com --auth-password pass
  $ qa-detective scan https://myapp.com --output report.json
  $ qa-detective scan https://myapp.com --output report.pdf --format pdf
  $ qa-detective scan https://myapp.com --checks security,performance,lighthouse,load --max-pages 5
  $ qa-detective scan https://myapp.com --fail-on critical
  
  Snapshot Testing:
  $ qa-detective scan https://myapp.com --snapshot
  $ qa-detective scan https://myapp.com --check-snapshot --snapshot-verbose
  $ qa-detective snapshot list
  $ qa-detective snapshot delete --url https://myapp.com
  $ qa-detective snapshot clear

Checks available:
  security, performance, accessibility, load (Artillery), lighthouse (web perf)

Snapshot Testing:
  --snapshot               Save results as baseline snapshot
  --check-snapshot         Check results against baseline (default: enabled)
  --snapshot-dir <dir>     Where to store snapshots (default: .qa-snapshots)
  --snapshot-verbose       Show detailed snapshot comparison

Snapshot Commands:
  snapshot list            List all stored snapshots
  snapshot delete --url    Delete snapshot for specific URL
  snapshot clear           Delete all snapshots

For load: npm install -g artillery
For lighthouse: npm install -g lighthouse

For more info, see: https://github.com/mrauthentik/QA-crawler
`);

program
  .command('login')
  .description('Authenticate with QA Detective (opens browser for OAuth login)')
  .option('--token <token>', 'Set token directly (for CI/automation)')
  .action(async (options) => {
    try {
      if (options.token) {
        // Direct token input
        saveCredentials({
          token: options.token,
          email: 'unknown',
          name: 'CI User',
        });
        console.log(chalk.green('✓ Token saved to ~/.qa-detective/credentials.json'));
        return;
      }

      const spinner = ora('Initializing login...').start();

      const authUrl = getAuthServiceUrl();
      const deviceCodeUrl = `${authUrl}/api/auth/device-code`;

      // Step 1: Get device code
      spinner.text = 'Requesting device code...';
      const codeRes = await fetch(deviceCodeUrl, { method: 'POST' });

      if (!codeRes.ok) {
        throw new Error('Failed to get device code from auth service');
      }

      const codeData = (await codeRes.json()) as {
        deviceCode: string;
        userCode: string;
        verificationUrl: string;
        expiresIn: number;
      };
      const { userCode, verificationUrl, deviceCode, expiresIn } = codeData;

      spinner.succeed();

      // Step 2: Open browser for user to authenticate
      console.log(chalk.cyan('\n🔐 Browser login initiated:\n'));
      console.log(chalk.bold(`   Code: ${userCode}`));
      console.log(`   URL:  ${verificationUrl}\n`);

      const { execSync } = require('child_process');
      try {
        const openCmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
        execSync(`${openCmd} "${verificationUrl}"`, { stdio: 'ignore' });
      } catch {
        // Browser open failed, user will visit manually
      }

      // Step 3: Poll for token
      const pollUrl = `${authUrl}/api/auth/device-token`;
      const pollSpinner = ora('Waiting for authentication...').start();

      const startTime = Date.now();
      const timeoutMs = expiresIn * 1000;

      while (Date.now() - startTime < timeoutMs) {
        await new Promise(r => setTimeout(r, 3000)); // Poll every 3 seconds

        try {
          const tokenRes = await fetch(pollUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceCode }),
          });

          if (tokenRes.status === 200) {
            const tokenData = (await tokenRes.json()) as {
              token: string;
              email: string;
              name: string;
            };

            saveCredentials({
              token: tokenData.token,
              email: tokenData.email,
              name: tokenData.name,
            });

            pollSpinner.succeed(chalk.green('✓ Authenticated!'));
            console.log(chalk.cyan(`\nLogged in as: ${tokenData.name} (${tokenData.email})`));
            console.log(chalk.gray('Token saved to ~/.qa-detective/credentials.json\n'));
            return;
          }
        } catch (err) {
          // Continue polling on error
        }
      }

      pollSpinner.fail(chalk.red('Authentication timeout'));
      process.exit(1);
    } catch (err) {
      console.error(chalk.red(`\n✗ Login failed: ${(err as Error).message}`));
      process.exit(1);
    }
  });

program
  .command('logout')
  .description('Clear stored credentials')
  .action(() => {
    clearCredentials();
    console.log(chalk.green('✓ Logged out'));
  });

program
  .command('whoami')
  .description('Show current logged-in user')
  .action(() => {
    const creds = loadCredentials();
    if (!creds) {
      console.log(chalk.yellow('Not logged in. Run: qa-detective login'));
      return;
    }
    console.log(chalk.cyan(`${creds.name} (${creds.email})`));
  });

program
  .command('scan')
  .argument('<url>', 'Target URL to scan (e.g., https://myapp.com)')
  .option('-e, --auth-email <email>', 'Login email for authenticated scans')
  .option('-p, --auth-password <password>', 'Login password for authenticated scans')
  .option('-l, --auth-login-url <url>', 'Custom login page URL')
  .option('-o, --output <file>', 'Save results to file (json/pdf)')
  .option('-f, --format <format>', 'Output format: json (default) or pdf', 'json')
  .option('-c, --checks <list>', 'Comma-separated checks to run (e.g., security,performance,accessibility)')
  .option('-m, --max-pages <n>', 'Max pages to scan (default: 10)', '10')
  .option('-t, --timeout <ms>', 'Navigation timeout in milliseconds (default: 30000)', '30000')
  .option('-H, --header <header...>', 'Custom HTTP headers (repeatable, e.g., -H "Authorization: Bearer ...")')
  .option('--fail-on <severity>', 'Exit with code 1 if severity found (e.g., critical,high)')
  .option('--token <token>', 'QA Detective API token (or set QA_DETECTIVE_TOKEN env var)')
  .option('--local', 'Run scan locally using Python agent (requires Python 3.8+)')
  .option('--public-url <url>', 'Use custom public URL instead of auto tunnel (for localhost scans)')
  .option('--tunnel-provider <provider>', 'Tunnel provider: ngrok, localtunnel, cloudflare (default: ngrok)', 'ngrok')
  .option('--snapshot', 'Save results as baseline snapshot for future comparisons')
  .option('--check-snapshot', 'Check results against baseline snapshot (default: true)', true)
  .option('--snapshot-dir <dir>', 'Directory to store snapshots (default: .qa-snapshots)', '.qa-snapshots')
  .option('--snapshot-verbose', 'Show detailed snapshot comparison results')
  
  //this take care of the scan logic and output handling
  .action(async (url, options) => {
    const spinner = ora('Scanning...').start();
    let activeTunnel: { publicUrl: string; close: (() => Promise<void>) | (() => void); provider?: string } | null = null;
    try {
      // Handle localhost URLs — create tunnel so API can reach it
      let scanUrl = url;

      if (isLocalUrl(url)) {
        spinner.text = 'localhost detected...';
        
        // Use custom public URL if provided
        if (options.publicUrl) {
          scanUrl = options.publicUrl;
          spinner.text = `Using custom public URL: ${scanUrl}`;
          console.log('\n' + chalk.cyan(`  🔗 Using provided URL: ${scanUrl}`));
        } else {
          // Create automatic tunnel
          spinner.text = 'localhost detected — creating public tunnel...';
          process.env.QA_DETECTIVE_TUNNEL_PROVIDER = options.tunnelProvider;
          
          try {
            const port = extractPort(url);
            activeTunnel = await createTunnel(port);
            scanUrl = activeTunnel.publicUrl;
            spinner.text = `Tunnel created: ${scanUrl}`;
            console.log('\n' + chalk.cyan(`  🔗 Tunnel: ${url} → ${scanUrl}`));
            console.log(chalk.gray(`  Provider: ${activeTunnel.provider}`));
            // Give tunnel a moment to stabilise
            await new Promise(r => setTimeout(r, 1500));
          } catch (err) {
            const errorMsg = (err as Error).message;
            spinner.fail(chalk.red(`\nTunnel creation failed:\n${errorMsg}`));
            console.log(chalk.yellow('\n💡 Quick fixes:\n'));
            console.log(chalk.white('  1. Use ngrok (most reliable):'));
            console.log(chalk.gray('     - Get free token: https://dashboard.ngrok.com\n     - export NGROK_AUTHTOKEN=your_token\n     - qa-detective scan http://localhost:3000\n'));
            console.log(chalk.white('  2. Provide your own public URL:'));
            console.log(chalk.gray('     - qa-detective scan http://localhost:3000 --public-url https://your-tunnel.com\n'));
            console.log(chalk.white('  3. Scan external URL instead of localhost\n'));
            process.exit(1);
          }
        }
      }

      // Update spinner with progress
      const onProgress = (status: string) => {
        const messages: Record<string, string> = {
          queued: 'Run queued — waiting for worker...',
          running: 'Investigation in progress — crawling and testing...',
          completed: 'Analysis complete!',
          failed: 'Run failed',
        };
        spinner.text = messages[status] || `Status: ${status}`;
      };

      // Auto-load stored credentials if no token provided
      let token = options.token || process.env.QA_DETECTIVE_TOKEN;
      if (!token) {
        const creds = loadCredentials();
        if (creds) {
          token = creds.token;
          spinner.text = `Using stored credentials for ${creds.email}...`;
        }
      }

      if (token) process.env.QA_DETECTIVE_TOKEN = token;
      else if (!options.local) {
        spinner.fail(chalk.yellow('No authentication found'));
        console.log(chalk.cyan('\n🔐 Get started:\n'));
        console.log(chalk.white('  1. Login:'));
        console.log(chalk.gray('     $ qa-detective login\n'));
        console.log(chalk.white('  2. Run your first scan:'));
        console.log(chalk.gray(`     $ qa-detective scan ${url}\n`));
        process.exit(1);
      }

      const result = await runScan({
        url: scanUrl,
        authEmail: options.authEmail,
        authPassword: options.authPassword,
        authLoginUrl: options.authLoginUrl,
        checks: options.checks,
        maxPages: options.maxPages,
        timeout: options.timeout,
        headers: options.header,
      }, onProgress);
      if (activeTunnel) {
        await activeTunnel.close();
      }
      spinner.succeed(chalk.green('Scan completed! 🚀'));
      
      // Handle snapshot testing
      const snapshotManager = new SnapshotManager(options.snapshotDir);
      if (options.snapshot) {
        const saveResult = snapshotManager.saveSnapshot(url, result);
        console.log(chalk.cyan(`\n📸 ${saveResult.message}`));
      } else if (options.checkSnapshot) {
        const checkResult = snapshotManager.checkSnapshot(url, result);
        console.log(chalk.cyan(`\n📸 ${checkResult.message}`));
        
        if (checkResult.changes && checkResult.changes.length > 0) {
          console.log(chalk.yellow(`\n⚠️ ${checkResult.changes.length} change(s) detected:`));
          for (const change of checkResult.changes) {
            console.log(chalk.gray(`  • ${change.field}`));
            if (options.snapshotVerbose) {
              console.log(chalk.gray(`    Previous: ${JSON.stringify(change.previous).substring(0, 50)}...`));
              console.log(chalk.gray(`    Current:  ${JSON.stringify(change.current).substring(0, 50)}...`));
            }
          }
          console.log(chalk.gray(`\n  Run with --snapshot to update baseline`));
        }
      }
      
      if (result.grade) {
        console.log(chalk.bold(`\nGrade: ${result.grade} | Score: ${result.score}/100`));
      }
      if (result.summary) {
        console.log(chalk.gray(`\nSummary: ${result.summary}\n`));
      }
      if (result.reportUrl) {
        console.log(chalk.cyan(`Full report: ${result.reportUrl}\n`));
      }

      // Handle --output flag
      if (options.output) {
        if (options.format === 'json') {
          fs.writeFileSync(options.output, JSON.stringify(result, null, 2));
          console.log(chalk.yellow(`Results saved to ${options.output}`));
        } else if (options.format === 'pdf') {
          await generatePdfReport(result, options.output);
          console.log(chalk.yellow(`PDF report saved to ${options.output}`));
        } else {
          console.log(chalk.red('Unsupported output format. Use json or pdf.'));
        }

      } else {
        // Pretty-print results with colored severities (one per line)
        if (result && result.results && Array.isArray(result.results)) {
          for (const r of (result.results as any[])) {
            const sev = (r.severity || '').toLowerCase();
            let sevColor = sev;
            if (sev === 'critical') sevColor = chalk.bgRed.white.bold(sev);
            else if (sev === 'high') sevColor = chalk.red(sev);
            else if (sev === 'medium') sevColor = chalk.yellow(sev);
            else if (sev === 'low') sevColor = chalk.blue(sev);
            else if (sev === 'info') sevColor = chalk.cyan(sev);
            else sevColor = chalk.gray(sev);
            console.log(`${chalk.bold(r.name || r.id || '')}: ${r.status || ''} | Severity: ${sevColor}`);
            if (r.what) console.log(chalk.white('  What:'), r.what);
            if (r.why) console.log(chalk.white('  Why:'), r.why);
            if (r.how) console.log(chalk.white('  How:'), r.how);
            console.log('');
          }
        } else {
          console.log(chalk.blue(JSON.stringify(result, null, 2)));
        }
      }

      // Handle --fail-on flag
      if (options.failOn) {
        const threshold = options.failOn.toLowerCase();
        // Define severity order
        const severityOrder = ['info', 'low', 'medium', 'high', 'critical'];
        const thresholdIdx = severityOrder.indexOf(threshold);
        if (thresholdIdx === -1) {
          console.log(chalk.red(`Unknown severity for --fail-on: ${options.failOn}`));
        } else {
          const failed = (result.results as any[]) && (result.results as any[]).some((r: any) => {
            const idx = severityOrder.indexOf((r.severity || '').toLowerCase());
            return idx >= thresholdIdx;
          });
          if (failed) {
            console.log(chalk.red(`Exiting with code 1 due to findings at or above severity: ${options.failOn}`));
            process.exit(1);
          }
        }
      }
    } catch (err) {
      if (activeTunnel) {
        try {
          await activeTunnel.close();
        } catch (closeErr) {
          console.warn(chalk.gray('Could not close tunnel:', (closeErr as Error).message));
        }
      }
      spinner.fail(chalk.red(`Scan failed ⚠️: ${(err as Error).message}`));
      process.exit(1);
    }
  });

// Snapshot management command
program
  .command('snapshot <action>')
  .argument('<action>', 'Action: list, delete, clear (delete all)')
  .option('--url <url>', 'URL of snapshot to delete')
  .option('--snapshot-dir <dir>', 'Directory storing snapshots (default: .qa-snapshots)', '.qa-snapshots')
  .description('Manage snapshot baselines')
  .action((action, options) => {
    const snapshotManager = new SnapshotManager(options.snapshotDir);

    if (action === 'list') {
      const snapshots = snapshotManager.listSnapshots();
      
      if (snapshots.length === 0) {
        console.log(chalk.yellow('No snapshots found.'));
        return;
      }

      console.log(chalk.bold('\n📸 Stored Snapshots:\n'));
      snapshots.forEach((snapshot, idx) => {
        console.log(chalk.cyan(`${idx + 1}. ${snapshot.url}`));
        console.log(chalk.gray(`   File: ${snapshot.filename}`));
        console.log(chalk.gray(`   Date: ${new Date(snapshot.timestamp).toLocaleString()}\n`));
      });
    } else if (action === 'delete') {
      if (!options.url) {
        console.log(chalk.red('Error: --url is required for delete action'));
        process.exit(1);
      }

      const deleted = snapshotManager.deleteSnapshot(options.url);
      if (deleted) {
        console.log(chalk.green(`✅ Snapshot deleted for ${options.url}`));
      } else {
        console.log(chalk.yellow(`⚠️ No snapshot found for ${options.url}`));
      }
    } else if (action === 'clear') {
      const count = snapshotManager.deleteAllSnapshots();
      console.log(chalk.green(`✅ Deleted ${count} snapshot(s)`));
    } else {
      console.log(chalk.red(`Unknown action: ${action}. Use: list, delete, clear`));
      process.exit(1);
    }
  });

program.parse();
