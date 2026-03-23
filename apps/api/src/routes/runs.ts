import { Router, Response, Request } from 'express';
import { Queue } from 'bullmq';
import {
  createTestRun,
  getTestRun,
  getAllTestRuns,
  deleteTestRun,
  toggleRunVisibility,
} from '../db/index';
import { requireAuth, optionalAuth, AuthRequest } from '../middleware/auth';

const router = Router();

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

const pipelineQueue = new Queue('pipeline', { connection });

// ─── POST /api/runs ───────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { url, description } = req.body;

    if (!url || !description) {
      return res.status(400).json({ error: 'Both url and description are required' });
    }

    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    const runId = await createTestRun(url, description, req.userId);

    await pipelineQueue.add(
      'run-pipeline',
      { runId, url, description },
      { attempts: 2, backoff: { type: 'exponential', delay: 5000 } }
    );

    console.log(`📥 New run queued: ${runId} for ${url} by user ${req.userId}`);

    return res.status(202).json({
      message: 'Test run queued successfully',
      runId,
      status: 'pending',
      pollUrl: `/api/runs/${runId}`,
    });
  } catch (err) {
    console.error('Error creating run:', err);
    return res.status(500).json({ error: 'Failed to create test run' });
  }
});

// ─── GET /api/runs ────────────────────────────────────────────────────────────
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const runs = await getAllTestRuns(req.userId);
    return res.json({ runs });
  } catch (err) {
    console.error('Error fetching runs:', err);
    return res.status(500).json({ error: 'Failed to fetch runs' });
  }
});

// ─── GET /api/runs/:id ────────────────────────────────────────────────────────
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const run = await getTestRun(req.params.id);
    if (!run) return res.status(404).json({ error: 'Run not found' });

    const isOwner = req.userId && req.userId === run.user_id;

    // Private run — only owner can view
    if (!run.is_public && !isOwner) {
      return res.status(403).json({
        error: 'This investigation is private',
        code: 'PRIVATE_RUN',
      });
    }

    return res.json({ run, isOwner: !!isOwner });
  } catch (err) {
    console.error('Error fetching run:', err);
    return res.status(500).json({ error: 'Failed to fetch run' });
  }
});

// ─── PATCH /api/runs/:id/visibility ──────────────────────────────────────────
router.patch('/:id/visibility', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { isPublic } = req.body;

    if (typeof isPublic !== 'boolean') {
      return res.status(400).json({ error: 'isPublic must be a boolean' });
    }

    const run = await getTestRun(req.params.id);
    if (!run) return res.status(404).json({ error: 'Run not found' });

    if (run.user_id !== req.userId) {
      return res.status(403).json({ error: 'You do not have permission to update this run' });
    }

    await toggleRunVisibility(req.params.id, isPublic);

    console.log(`🔒 Run ${req.params.id} set to ${isPublic ? 'public' : 'private'} by ${req.userId}`);

    return res.json({
      message: `Run is now ${isPublic ? 'public' : 'private'}`,
      isPublic,
    });
  } catch (err) {
    console.error('Error updating visibility:', err);
    return res.status(500).json({ error: 'Failed to update visibility' });
  }
});

// ─── DELETE /api/runs/:id ─────────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const run = await getTestRun(req.params.id);
    if (!run) return res.status(404).json({ error: 'Run not found' });

    if (run.user_id && run.user_id !== req.userId) {
      return res.status(403).json({ error: 'You do not have permission to delete this run' });
    }

    const deleted = await deleteTestRun(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Run not found' });

    console.log(`🗑  Run deleted: ${req.params.id} by user ${req.userId}`);
    return res.json({ message: 'Run deleted successfully' });
  } catch (err) {
    console.error('Error deleting run:', err);
    return res.status(500).json({ error: 'Failed to delete run' });
  }
});

// ─── POST /api/runs/:id/rerun ─────────────────────────────────────────────────
router.post('/:id/rerun', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const original = await getTestRun(req.params.id);
    if (!original) return res.status(404).json({ error: 'Run not found' });

    if (original.user_id && original.user_id !== req.userId) {
      return res.status(403).json({ error: 'You do not have permission to re-run this investigation' });
    }

    const newRunId = await createTestRun(original.url, original.description, req.userId);

    await pipelineQueue.add(
      'run-pipeline',
      { runId: newRunId, url: original.url, description: original.description },
      { attempts: 2, backoff: { type: 'exponential', delay: 5000 } }
    );

    console.log(`🔁 Re-run queued: ${newRunId} (from ${req.params.id}) by user ${req.userId}`);

    return res.status(202).json({
      message: 'Re-run queued successfully',
      runId: newRunId,
      status: 'pending',
      pollUrl: `/api/runs/${newRunId}`,
    });
  } catch (err) {
    console.error('Error re-running:', err);
    return res.status(500).json({ error: 'Failed to queue re-run' });
  }
});

export default router;
