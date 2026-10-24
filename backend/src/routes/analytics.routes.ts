import { Router, Response } from 'express';
import { optionalAuthenticate, AuthRequest } from '../middleware/auth.js';
import { analyticsService } from '../services/analyticsService.js';

export const analyticsRouter = Router();

analyticsRouter.get('/summary', optionalAuthenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const userId = req.query.userOnly === 'true' && req.user ? req.user.userId : undefined;

    const summary = await analyticsService.getSummary({ startDate, endDate, userId });
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

analyticsRouter.get('/trends', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 14;
    const trends = await analyticsService.getTrends(days);
    res.json(trends);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

analyticsRouter.get('/insights', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const insights = await analyticsService.generateWasteIntelligenceInsights();
    res.json(insights);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
