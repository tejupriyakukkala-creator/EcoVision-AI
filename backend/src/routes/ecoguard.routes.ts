import { Router, Response } from 'express';
import { optionalAuthenticate, authenticate, AuthRequest } from '../middleware/auth.js';
import { WasteRecord } from '../models/WasteRecord.js';
import { ReviewFeedback } from '../models/ReviewFeedback.js';

export const ecoguardRouter = Router();

// GET /api/ecoguard/review-queue - Get items requiring human review
ecoguardRouter.get('/review-queue', optionalAuthenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const priority = req.query.priority as string;
    const category = req.query.category as string;
    const limit = parseInt(req.query.limit as string) || 25;
    const page = parseInt(req.query.page as string) || 1;

    const filter: any = {
      $or: [
        { reviewStatus: { $in: ['needs_review', 'disputed'] } },
        { reviewPriority: { $in: ['medium', 'high', 'critical'] } },
        { modelAgreement: { $in: ['disputed', 'low_confidence'] } },
      ],
    };

    if (priority && priority !== 'All') {
      filter.reviewPriority = priority;
    }
    if (category && category !== 'All') {
      filter.wasteCategory = category;
    }

    const total = await WasteRecord.countDocuments(filter);
    const queue = await WasteRecord.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('sessionId', 'inputType fileReference createdAt');

    res.json({
      queue,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    console.error('[EcoGuard Review Queue Error]', err);
    res.status(500).json({ error: 'Failed to fetch review queue' });
  }
});

// POST /api/ecoguard/:id/corrections - Submit user or expert correction
ecoguardRouter.post('/:id/corrections', optionalAuthenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { correctedPrediction, correctedCategory, reason, notes } = req.body;

    if (!correctedPrediction || !correctedCategory || !reason) {
      res.status(400).json({
        error: 'Missing required fields: correctedPrediction, correctedCategory, reason',
      });
      return;
    }

    const query = typeof id === 'string' && id.startsWith('ECO-') ? { recordId: id } : { _id: id };
    const record = await WasteRecord.findOne(query);

    if (!record) {
      res.status(404).json({ error: 'EcoTwin record not found' });
      return;
    }

    const originalPrediction = record.finalClassification;
    const originalCategory = record.wasteCategory;
    const reviewer = req.user ? req.user.email : 'expert_reviewer';

    // Append to WasteRecord corrections
    record.corrections.push({
      originalPrediction,
      originalCategory,
      correctedPrediction,
      correctedCategory,
      reason,
      reviewer,
      timestamp: new Date(),
    });

    // Update record state
    record.finalClassification = correctedPrediction;
    record.wasteCategory = correctedCategory;
    record.reviewStatus = 'confirmed';
    record.reviewPriority = 'none';

    // Record lifecycle event
    record.lifecycleEvents.push({
      eventType: 'expert_correction',
      previousStatus: record.lifecycleStatus,
      newStatus: record.lifecycleStatus,
      actor: reviewer,
      timestamp: new Date(),
      note: `Correction applied: changed "${originalPrediction}" (${originalCategory}) to "${correctedPrediction}" (${correctedCategory}). Reason: ${reason}`,
    });

    await record.save();

    // Create ReviewFeedback audit log (quarantined until admin verification)
    const feedback = new ReviewFeedback({
      recordId: record.recordId,
      originalPrediction,
      originalCategory,
      correctedPrediction,
      correctedCategory,
      reason,
      reviewer,
      reviewerId: req.user ? req.user.userId : undefined,
      approvedForRetraining: false,
      adminNotes: notes,
    });
    await feedback.save();

    res.json({
      message: 'Correction applied successfully and logged for retraining audit',
      record,
      feedbackId: feedback._id,
    });
  } catch (err: any) {
    console.error('[EcoGuard Correction Error]', err);
    res.status(500).json({ error: 'Failed to record correction' });
  }
});

// GET /api/ecoguard/model-agreement - Metrics on model agreement & uncertainty
ecoguardRouter.get('/model-agreement', async (req, res): Promise<void> => {
  try {
    const totalRecords = await WasteRecord.countDocuments();
    if (totalRecords === 0) {
      res.json({
        totalEvaluated: 0,
        fullAgreementCount: 0,
        refinementCount: 0,
        disputedCount: 0,
        lowConfidenceCount: 0,
        agreementRatePercent: 100,
        averageReadinessScore: 90,
        cleanlinessCompliancePercent: 95,
      });
      return;
    }

    const fullAgreementCount = await WasteRecord.countDocuments({ modelAgreement: 'full_agreement' });
    const refinementCount = await WasteRecord.countDocuments({ modelAgreement: 'refinement' });
    const disputedCount = await WasteRecord.countDocuments({ modelAgreement: 'disputed' });
    const lowConfidenceCount = await WasteRecord.countDocuments({ modelAgreement: 'low_confidence' });

    // Aggregate average readiness
    const readinessAgg = await WasteRecord.aggregate([
      { $group: { _id: null, avgScore: { $avg: '$segregationReadiness.score' } } },
    ]);
    const avgScore = readinessAgg.length > 0 ? Math.round(readinessAgg[0].avgScore * 10) / 10 : 90;

    const residueCount = await WasteRecord.countDocuments({ 'contaminationAssessment.hasVisibleResidue': true });
    const cleanlinessCompliance = Math.round(((totalRecords - residueCount) / totalRecords) * 100);

    const totalAgreed = fullAgreementCount + refinementCount;
    const agreementRate = Math.round((totalAgreed / totalRecords) * 100);

    res.json({
      totalEvaluated: totalRecords,
      fullAgreementCount,
      refinementCount,
      disputedCount,
      lowConfidenceCount,
      agreementRatePercent: agreementRate,
      averageReadinessScore: avgScore,
      cleanlinessCompliancePercent: cleanlinessCompliance,
      residueDetectedCount: residueCount,
    });
  } catch (err: any) {
    console.error('[EcoGuard Agreement Error]', err);
    res.status(500).json({ error: 'Failed to compute model agreement analytics' });
  }
});

// GET /api/ecoguard/feedback - List audit feedback records
ecoguardRouter.get('/feedback', optionalAuthenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const feedbacks = await ReviewFeedback.find().sort({ createdAt: -1 }).limit(50);
    res.json(feedbacks);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve feedback list' });
  }
});
