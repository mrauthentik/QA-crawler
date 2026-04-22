#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { runScan } from './scanRunner';
import { createTunnel, isLocalUrl, extractPort } from './tunnel';
import fs from 'fs';
import { generatePdfReport } from './pdfReport';

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

Checks available:
  security, performance, accessibility, load (Artillery), lighthouse (web perf)

For load: npm install -g artillery
For lighthouse: npm install -g lighthouse

For more info, see: https://github.com/mrauthentik/QA-crawler
`);

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
  
  //this take care of the scan logic and output handling
  .action(async (url, options) => {
    const spinner = ora('Scanning...').start();
    let activeTunnel: { publicUrl: string; close: () => void } | null = null;
    try {
      // Handle localhost URLs — create tunnel so API can reach it
      let scanUrl = url;

      if (isLocalUrl(url)) {
        spinner.text = 'localhost detected — creating public tunnel...';
        try {
          const port = extractPort(url);
          activeTunnel = await createTunnel(port);
          scanUrl = activeTunnel.publicUrl;
          spinner.text = `Tunnel created: ${scanUrl}`;
          console.log('\n' + chalk.cyan(`  🔗 Tunnel: ${url} → ${scanUrl}`));
          // Give tunnel a moment to stabilise
          await new Promise(r => setTimeout(r, 1500));
        } catch (err) {
          spinner.warn(chalk.yellow('Could not create tunnel — trying direct scan'));
          scanUrl = url;
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

      if (options.token) process.env.QA_DETECTIVE_TOKEN = options.token;

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
      if (activeTunnel) activeTunnel.close();
      spinner.succeed(chalk.green('Scan completed! 🚀'));
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
      if (activeTunnel) activeTunnel.close();
      spinner.fail(chalk.red('Scan failed ⚠️: ' + err));
      process.exit(1);
    }
  });

program.parse();
