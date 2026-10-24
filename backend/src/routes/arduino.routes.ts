import { Router, Request, Response } from 'express';
import { aiClient } from '../services/aiClient.js';

export const arduinoRouter = Router();

arduinoRouter.post('/trigger', async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, subtype, confidence, simulation = true } = req.body;
    if (!category || confidence === undefined) {
      res.status(400).json({ error: 'Waste category and confidence are required' });
      return;
    }

    const result = await aiClient.triggerArduino(category, subtype || 'item', confidence, simulation);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

arduinoRouter.post('/estop', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await aiClient.arduinoEstop();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

arduinoRouter.post('/reset', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await aiClient.arduinoReset();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
