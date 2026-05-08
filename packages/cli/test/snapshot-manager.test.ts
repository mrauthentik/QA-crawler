import { SnapshotManager } from '../src/snapshotManager';
import fs from 'fs';
import path from 'path';

describe('SnapshotManager', () => {
  let manager: SnapshotManager;
  const testDir = '.test-snapshots';

  beforeEach(() => {
    manager = new SnapshotManager(testDir);
    // Clean up before each test
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up after tests
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  it('should create snapshot directory when saving', () => {
    expect(fs.existsSync(testDir)).toBe(false); // Not created yet
    
    manager.saveSnapshot('https://example.com', { grade: 'A' });
    
    expect(fs.existsSync(testDir)).toBe(true); // Created after save
  });

  it('should save a snapshot', () => {
    const testUrl = 'https://example.com';
    const testResult = {
      grade: 'A',
      score: 95,
      summary: 'Good security posture',
      findings: [{ id: 'SEC-001', name: 'Test', severity: 'high', status: 'failed' }],
    };

    const result = manager.saveSnapshot(testUrl, testResult);

    expect(result.matched).toBe(true);
    expect(fs.existsSync(result.snapshotPath)).toBe(true);
  });

  it('should check snapshot when none exists', () => {
    const testUrl = 'https://example.com';
    const testResult = { grade: 'A', score: 95 };

    const result = manager.checkSnapshot(testUrl, testResult);

    expect(result.matched).toBe(true);
    expect(result.hasPreviousSnapshot).toBe(false);
    expect(result.message).toContain('No baseline snapshot found');
  });

  it('should match snapshot when results are identical', () => {
    const testUrl = 'https://example.com';
    const testResult = { grade: 'A', score: 95, summary: 'Good' };

    // Save first time
    manager.saveSnapshot(testUrl, testResult);

    // Check second time with same result
    const checkResult = manager.checkSnapshot(testUrl, testResult);

    expect(checkResult.matched).toBe(true);
    expect(checkResult.hasPreviousSnapshot).toBe(true);
    expect(checkResult.message).toContain('match baseline');
  });

  it('should detect changes in snapshot', () => {
    const testUrl = 'https://example.com';
    const initialResult = { grade: 'A', score: 95, summary: 'Good' };
    const changedResult = { grade: 'B', score: 75, summary: 'Poor' };

    // Save initial
    manager.saveSnapshot(testUrl, initialResult);

    // Check with changed result
    const checkResult = manager.checkSnapshot(testUrl, changedResult);

    expect(checkResult.matched).toBe(false);
    expect(checkResult.hasPreviousSnapshot).toBe(true);
    expect(checkResult.changes).toBeDefined();
    expect(checkResult.changes!.length).toBeGreaterThan(0);
  });

  it('should list all snapshots', () => {
    const url1 = 'https://example1.com';
    const url2 = 'https://example2.com';

    manager.saveSnapshot(url1, { grade: 'A' });
    manager.saveSnapshot(url2, { grade: 'B' });

    const snapshots = manager.listSnapshots();

    expect(snapshots.length).toBe(2);
    expect(snapshots[0].url).toBeDefined();
    expect(snapshots[1].url).toBeDefined();
  });

  it('should delete a snapshot', () => {
    const testUrl = 'https://example.com';
    manager.saveSnapshot(testUrl, { grade: 'A' });

    const deleted = manager.deleteSnapshot(testUrl);

    expect(deleted).toBe(true);
    const snapshots = manager.listSnapshots();
    expect(snapshots.length).toBe(0);
  });

  it('should delete all snapshots', () => {
    manager.saveSnapshot('https://example1.com', { grade: 'A' });
    manager.saveSnapshot('https://example2.com', { grade: 'B' });

    const count = manager.deleteAllSnapshots();

    expect(count).toBe(2);
    const snapshots = manager.listSnapshots();
    expect(snapshots.length).toBe(0);
  });

  it('should normalize findings for comparison', () => {
    const testUrl = 'https://example.com';
    const result = {
      grade: 'A',
      findings: [
        { id: 'F1', name: 'Test1', severity: 'high', status: 'failed' },
        { id: 'F2', name: 'Test2', severity: 'medium', status: 'passed' },
      ],
    };

    manager.saveSnapshot(testUrl, result);
    const checkResult = manager.checkSnapshot(testUrl, {
      ...result,
      findings: result.findings.slice().reverse(), // Different order
    });

    expect(checkResult.matched).toBe(true); // Should match after normalization
  });
});
