import { Router, Response } from 'express';
import { optionalAuthenticate, authenticate, AuthRequest } from '../middleware/auth.js';
import { WasteRecord, IWasteRecord } from '../models/WasteRecord.js';

export const ecotwinRouter = Router();

// Valid lifecycle statuses and permitted transitions
const VALID_STATUSES = [
  'detected',
  'classified',
  'needs_review',
  'recommendation_generated',
  'action_confirmed',
  'closed',
];

// GET /api/ecotwin - Query digital waste identity records with filters
ecotwinRouter.get('/', optionalAuthenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const category = req.query.category as string;
    const lifecycleStatus = req.query.lifecycleStatus as string;
    const reviewStatus = req.query.reviewStatus as string;
    const search = req.query.search as string;

    const filter: any = {};

    if (category && category !== 'All') {
      filter.wasteCategory = category;
    }
    if (lifecycleStatus && lifecycleStatus !== 'All') {
      filter.lifecycleStatus = lifecycleStatus;
    }
    if (reviewStatus && reviewStatus !== 'All') {
      filter.reviewStatus = reviewStatus;
    }
    if (search) {
      filter.$or = [
        { recordId: { $regex: search, $options: 'i' } },
        { finalClassification: { $regex: search, $options: 'i' } },
        { yoloLabel: { $regex: search, $options: 'i' } },
        { cnnSubtype: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await WasteRecord.countDocuments(filter);
    const records = await WasteRecord.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('sessionId', 'inputType fileReference createdAt');

    res.json({
      records,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    console.error('[EcoTwin Query Error]', err);
    res.status(500).json({ error: 'Failed to retrieve EcoTwin records' });
  }
});

// GET /api/ecotwin/:id - Retrieve specific waste record by recordId (ECO-XXXX) or Mongo ID
ecotwinRouter.get('/:id', optionalAuthenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    let record: IWasteRecord | null = null;

    if (typeof id === 'string' && id.startsWith('ECO-')) {
      record = await WasteRecord.findOne({ recordId: id }).populate('sessionId');
    } else {
      record = await WasteRecord.findById(id).populate('sessionId');
    }

    if (!record) {
      res.status(404).json({ error: 'EcoTwin record not found' });
      return;
    }

    res.json(record);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve EcoTwin record' });
  }
});

// GET /api/ecotwin/:id/timeline - Retrieve lifecycle event timeline for a waste record
ecotwinRouter.get('/:id/timeline', optionalAuthenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const query = typeof id === 'string' && id.startsWith('ECO-') ? { recordId: id } : { _id: id };

    const record = await WasteRecord.findOne(query).select('recordId lifecycleStatus lifecycleEvents corrections createdAt updatedAt');
    if (!record) {
      res.status(404).json({ error: 'EcoTwin record not found' });
      return;
    }

    res.json({
      recordId: record.recordId,
      currentStatus: record.lifecycleStatus,
      timeline: record.lifecycleEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
      corrections: record.corrections,
      createdAt: record.createdAt,
      lastUpdated: record.updatedAt,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve lifecycle timeline' });
  }
});

// PATCH /api/ecotwin/:id/status - Transition lifecycle status with audit recording
ecotwinRouter.patch('/:id/status', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { newStatus, note } = req.body;

    if (!newStatus || !VALID_STATUSES.includes(newStatus)) {
      res.status(400).json({
        error: `Invalid lifecycle status. Must be one of: ${VALID_STATUSES.join(', ')}`,
      });
      return;
    }

    const query = typeof id === 'string' && id.startsWith('ECO-') ? { recordId: id } : { _id: id };
    const record = await WasteRecord.findOne(query);

    if (!record) {
      res.status(404).json({ error: 'EcoTwin record not found' });
      return;
    }

    const prevStatus = record.lifecycleStatus;
    if (prevStatus === newStatus) {
      res.json({ message: 'Status already set to requested value', record });
      return;
    }

    record.lifecycleStatus = newStatus as any;
    record.lifecycleEvents.push({
      eventType: 'status_transition',
      previousStatus: prevStatus,
      newStatus,
      actor: req.user?.email || 'user',
      timestamp: new Date(),
      note: note || `Lifecycle transitioned from ${prevStatus} to ${newStatus}`,
    });

    if (newStatus === 'action_confirmed') {
      record.actionConfirmed = true;
    }

    await record.save();

    res.json({
      message: `EcoTwin ${record.recordId} transitioned to ${newStatus}`,
      record,
    });
  } catch (err: any) {
    console.error('[EcoTwin Status Patch Error]', err);
    res.status(500).json({ error: 'Failed to update lifecycle status' });
  }
});
