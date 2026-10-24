import { Router, Request, Response } from 'express';
import { DisposalRule } from '../models/DisposalRule.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';

export const disposalRulesRouter = Router();

// Get all disposal rules with optional category and search query
disposalRulesRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, search } = req.query;
    const query: any = {};

    if (category && category !== 'All') {
      query.wasteCategory = category;
    }
    if (search) {
      query.$or = [
        { itemSubtype: { $regex: search, $options: 'i' } },
        { disposalMethod: { $regex: search, $options: 'i' } },
        { reason: { $regex: search, $options: 'i' } },
      ];
    }

    const rules = await DisposalRule.find(query).sort({ wasteCategory: 1, itemSubtype: 1 });
    res.json(rules);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update a disposal rule (Admin only)
disposalRulesRouter.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const updated = await DisposalRule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) {
      res.status(404).json({ error: 'Disposal rule not found' });
      return;
    }
    res.json({ message: 'Disposal rule updated', rule: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
