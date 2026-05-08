import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface SnapshotResult {
  matched: boolean;
  snapshotPath: string;
  hasPreviousSnapshot: boolean;
  changes?: SnapshotDiff[];
  message: string;
}

export interface SnapshotDiff {
  field: string;
  previous: any;
  current: any;
}

export class SnapshotManager {
  private snapshotDir: string;

  constructor(snapshotDir: string = '.qa-snapshots') {
    this.snapshotDir = snapshotDir;
    this.ensureSnapshotDir();
  }

  /**
   * Generate a snapshot filename from a URL
   */
  private getSnapshotFilename(url: string): string {
    const hash = crypto
      .createHash('sha256')
      .update(url)
      .digest('hex')
      .slice(0, 8);
    const hostname = new URL(url).hostname.replace(/[^a-zA-Z0-9]/g, '-');
    return `${hostname}-${hash}.json`;
  }

  /**
   * Get snapshot path for a URL
   */
  private getSnapshotPath(url: string): string {
    const filename = this.getSnapshotFilename(url);
    return path.join(this.snapshotDir, filename);
  }

  /**
   * Ensure snapshot directory exists
   */
  private ensureSnapshotDir(): void {
    if (!fs.existsSync(this.snapshotDir)) {
      try {
        fs.mkdirSync(this.snapshotDir, { recursive: true });
      } catch (err) {
        // Directory might already exist from another process
        if (!fs.existsSync(this.snapshotDir)) {
          throw err;
        }
      }
    }
  }

  /**
   * Save a snapshot of scan results
   */
  saveSnapshot(url: string, result: any): SnapshotResult {
    this.ensureSnapshotDir();
    const snapshotPath = this.getSnapshotPath(url);
    
    const snapshot = {
      url,
      timestamp: new Date().toISOString(),
      result: this.normalizeResult(result),
    };

    fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));

    return {
      matched: true,
      snapshotPath,
      hasPreviousSnapshot: false,
      message: `✅ Snapshot saved to ${snapshotPath}`,
    };
  }

  /**
   * Check if result matches saved snapshot
   */
  checkSnapshot(url: string, result: any): SnapshotResult {
    const snapshotPath = this.getSnapshotPath(url);

    // No previous snapshot exists
    if (!fs.existsSync(snapshotPath)) {
      return {
        matched: true,
        snapshotPath,
        hasPreviousSnapshot: false,
        message: `ℹ️ No baseline snapshot found. Use --snapshot to create one.`,
      };
    }

    // Load and compare
    const snapshotContent = fs.readFileSync(snapshotPath, 'utf-8');
    const snapshot = JSON.parse(snapshotContent);
    const previousResult = snapshot.result;
    const currentResult = this.normalizeResult(result);

    const changes = this.compareResults(previousResult, currentResult);
    const matched = changes.length === 0;

    return {
      matched,
      snapshotPath,
      hasPreviousSnapshot: true,
      changes: matched ? undefined : changes,
      message: matched
        ? `✅ Results match baseline snapshot (${new Date(snapshot.timestamp).toLocaleString()})`
        : `⚠️ Results differ from baseline! ${changes.length} field(s) changed.`,
    };
  }

  /**
   * Get all snapshots with their URLs
   */
  listSnapshots(): Array<{ filename: string; url: string; timestamp: string }> {
    this.ensureSnapshotDir();
    
    if (!fs.existsSync(this.snapshotDir)) {
      return [];
    }

    const files = fs.readdirSync(this.snapshotDir).filter(f => f.endsWith('.json'));
    
    return files.map(filename => {
      try {
        const content = fs.readFileSync(path.join(this.snapshotDir, filename), 'utf-8');
        const snapshot = JSON.parse(content);
        return {
          filename,
          url: snapshot.url,
          timestamp: snapshot.timestamp,
        };
      } catch {
        return { filename, url: 'unknown', timestamp: 'unknown' };
      }
    });
  }

  /**
   * Delete a snapshot
   */
  deleteSnapshot(url: string): boolean {
    const snapshotPath = this.getSnapshotPath(url);
    
    if (fs.existsSync(snapshotPath)) {
      fs.unlinkSync(snapshotPath);
      return true;
    }
    
    return false;
  }

  /**
   * Delete all snapshots
   */
  deleteAllSnapshots(): number {
    this.ensureSnapshotDir();
    
    if (!fs.existsSync(this.snapshotDir)) {
      return 0;
    }

    const files = fs.readdirSync(this.snapshotDir);
    files.forEach(file => {
      fs.unlinkSync(path.join(this.snapshotDir, file));
    });

    return files.length;
  }

  /**
   * Normalize results for consistent comparison
   */
  private normalizeResult(result: any): any {
    const normalized: any = {};

    // Copy key fields in consistent order
    if (result.grade !== undefined) normalized.grade = result.grade;
    if (result.score !== undefined) normalized.score = result.score;
    if (result.summary !== undefined) normalized.summary = result.summary;
    
    // Normalize findings
    if (result.findings && Array.isArray(result.findings)) {
      normalized.findings = result.findings
        .map((f: any) => ({
          id: f.id,
          name: f.name,
          severity: f.severity,
          status: f.status,
        }))
        .sort((a: any, b: any) => a.id.localeCompare(b.id));
    }

    // Normalize results/issues
    if (result.results && Array.isArray(result.results)) {
      normalized.results = result.results
        .map((r: any) => ({
          id: r.id,
          name: r.name,
          severity: r.severity,
          status: r.status,
        }))
        .sort((a: any, b: any) => a.id.localeCompare(b.id));
    }

    // Count passed/failed
    if (result.passed !== undefined) normalized.passed = result.passed;
    if (result.failed !== undefined) normalized.failed = result.failed;

    return normalized;
  }

  /**
   * Deep compare two results and return differences
   */
  private compareResults(previous: any, current: any): SnapshotDiff[] {
    const diffs: SnapshotDiff[] = [];

    // Compare all keys
    const allKeys = new Set([
      ...Object.keys(previous || {}),
      ...Object.keys(current || {}),
    ]);

    for (const key of allKeys) {
      const prevVal = previous?.[key];
      const currVal = current?.[key];

      if (JSON.stringify(prevVal) !== JSON.stringify(currVal)) {
        diffs.push({
          field: key,
          previous: prevVal,
          current: currVal,
        });
      }
    }

    return diffs;
  }

  /**
   * Format snapshot result for display
   */
  formatResult(result: SnapshotResult, verbose: boolean = false): string {
    let output = `${result.message}\n`;

    if (result.changes && result.changes.length > 0 && verbose) {
      output += `\n📊 Changes detected:\n`;
      for (const change of result.changes) {
        output += `\n  ${change.field}:\n`;
        output += `    Previous: ${JSON.stringify(change.previous)}\n`;
        output += `    Current:  ${JSON.stringify(change.current)}\n`;
      }
    }

    return output;
  }
}
