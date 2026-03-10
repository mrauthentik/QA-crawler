import {Router, Request, Response} from 'express';
import { Queue } from 'bullmq';
import { createTestRun, getTestRun, getAllTestRuns } from '../db/index'

const router = Router()

const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379')
}

const pipelineQueue = new Queue('pipeline', { connection })

//For POST /api/runs - this submit a new test run
router.post('/', async (req: Request, res: Response) => {
    try{
        const {url, description} = req.body;
        if(!url || !description){
            return res.status(400).json({
                error: 'Both url and description are required'
            })
        }
        //Validate url
    
        try{
            new URL(url)
        }catch{
            return res.status(400).json({error: 'Invalid URL format'})
        }

        //Create run record in database

        const runId = await createTestRun(url, description)

        //Push job to queue
        await pipelineQueue.add('run-pipeline', {
            runId,
            url,
            description
        },{
            attempts:2,
            backoff: {type: 'exponential', delay:5000}
        })

        console.log( `📥 New run queued: ${runId} for ${url}`) 
         return res.status(202).json({
      message: 'Test run queued successfully',
      runId,
      status: 'pending',
      pollUrl: `/api/runs/${runId}`,
    });
    } catch(err){
        console.error('Error creating run:', err);
    return res.status(500).json({ error: 'Failed to create test run' });
    }
});

// GET /api/runs — get all runs
router.get('/', async (_req: Request, res: Response) => {
  try {
    const runs = await getAllTestRuns();
    return res.json({ runs });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch runs' });
  }
});

// GET /api/runs/:id — get a specific run with full results
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const run = await getTestRun(req.params.id);
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }
    return res.json({ run });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch run' });
  }
});

export default router;