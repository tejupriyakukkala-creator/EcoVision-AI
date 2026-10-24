import { Router, Request, Response } from 'express';
import { ModelEvaluation } from '../models/ModelEvaluation.js';
import { aiClient } from '../services/aiClient.js';

export const modelRouter = Router();

modelRouter.get('/status', async (_req: Request, res: Response): Promise<void> => {
  try {
    const aiStatus = await aiClient.getModelStatus();
    res.json(aiStatus);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

modelRouter.get('/evaluations', async (_req: Request, res: Response): Promise<void> => {
  try {
    const evaluations = await ModelEvaluation.find().sort({ evaluationDate: -1 });
    res.json(evaluations);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
