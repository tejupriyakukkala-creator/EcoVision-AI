import { Router, Response } from 'express';
import { upload } from '../middleware/upload.js';
import { optionalAuthenticate, authenticate, AuthRequest } from '../middleware/auth.js';
import { DetectionSession } from '../models/DetectionSession.js';
import { Detection } from '../models/Detection.js';
import { WasteRecord } from '../models/WasteRecord.js';
import { aiClient } from '../services/aiClient.js';

export const detectionRouter = Router();

// Helper to construct WasteRecord from AI prediction
function createWasteRecordDoc(session: any, d: any, userId?: any) {
  const recordId = d.record_id || `ECO-${Math.floor(1000 + Math.random() * 9000)}`;
  const agreement = d.model_agreement || 'full_agreement';
  const priority = d.review_priority || (d.review_status === 'needs_review' ? 'medium' : 'none');
  const readiness = d.segregation_readiness || { score: 90.0, rating: 'High' };
  const contamination = d.contamination_assessment || {
    hasVisibleResidue: false,
    residueType: 'none',
    cleanlinessScore: 95.0,
    supported: true,
    note: 'Optical surface inspection completed',
  };

  const initialStatus = d.review_status === 'needs_review' ? 'needs_review' : 'recommendation_generated';

  return new WasteRecord({
    recordId,
    sessionId: session._id,
    userId,
    bbox: d.bbox,
    yoloLabel: d.yolo_label,
    yoloConfidence: d.yolo_confidence,
    cnnSubtype: d.cnn_subtype,
    cnnConfidence: d.cnn_confidence,
    cnnProbabilities: d.cnn_probabilities || {},
    finalClassification: d.final_classification,
    wasteCategory: d.waste_category,
    reviewStatus: d.review_status,
    lifecycleStatus: initialStatus,
    modelAgreement: agreement,
    reviewPriority: priority,
    confidenceScore: d.confidence_score,
    contaminationAssessment: {
      hasVisibleResidue: contamination.has_visible_residue ?? contamination.hasVisibleResidue ?? false,
      residueType: contamination.residue_type ?? contamination.residueType ?? 'none',
      cleanlinessScore: contamination.cleanliness_score ?? contamination.cleanlinessScore ?? 95.0,
      supported: contamination.supported ?? true,
      note: contamination.note || 'Optical inspection completed',
    },
    segregationReadiness: {
      score: readiness.score ?? 90.0,
      factors: readiness.factors ?? {},
      rating: readiness.rating ?? 'High',
    },
    disposalRecommendation: {
      detectedItem: d.disposal_recommendation?.detected_item || d.final_classification,
      wasteCategory: d.disposal_recommendation?.waste_category || d.waste_category,
      suggestedDisposal: d.disposal_recommendation?.suggested_disposal || 'Standard Recycling',
      preparationInstructions: d.disposal_recommendation?.preparation_instructions || [],
      recyclingEligibility: d.disposal_recommendation?.recycling_eligibility ?? true,
      confidenceScore: d.disposal_recommendation?.confidence_score || d.confidence_score,
      reason: d.disposal_recommendation?.reason || 'Verified material match',
      localRulesNotice: d.disposal_recommendation?.local_rules_notice || 'Check municipal recycling guidelines',
      binType: d.disposal_recommendation?.bin_type || 'Standard Recycling',
      binColor: d.disposal_recommendation?.bin_color || '#10b981',
      applicableRegion: d.disposal_recommendation?.applicable_region || 'Municipal Standard',
      ruleSource: d.disposal_recommendation?.rule_source || 'Standard Municipal Recycling Ordinance',
    },
    lifecycleEvents: [
      {
        eventType: 'detection',
        previousStatus: 'none',
        newStatus: 'detected',
        actor: 'yolo_v8n_detector',
        timestamp: new Date(),
        note: `Object localized with confidence ${(d.yolo_confidence * 100).toFixed(1)}%`,
      },
      {
        eventType: 'classification',
        previousStatus: 'detected',
        newStatus: 'classified',
        actor: 'waste_convnet_cnn',
        timestamp: new Date(),
        note: `Material confirmed as ${d.final_classification}`,
      },
      {
        eventType: 'recommendation',
        previousStatus: 'classified',
        newStatus: initialStatus,
        actor: 'ecoroute_engine',
        timestamp: new Date(),
        note: `Disposal routed to ${d.waste_category}`,
      },
    ],
  });
}

// Process uploaded image or video, run YOLO + CNN inference, and persist to MongoDB
detectionRouter.post(
  '/',
  optionalAuthenticate,
  upload.single('file'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const file = req.file;
      const confidence = req.body.confidence ? parseFloat(req.body.confidence) : 0.25;
      const inputType = req.body.inputType || (file && file.mimetype.startsWith('video/') ? 'video' : 'image');

      if (!file && inputType !== 'webcam_frame') {
        res.status(400).json({ error: 'No media file provided for analysis' });
        return;
      }

      let aiResult: any;

      if (inputType === 'video' && file) {
        // Run video multi-frame processor
        aiResult = await aiClient.predictVideo(file.path, 15, 120);

        const session = new DetectionSession({
          userId: req.user ? req.user.userId : undefined,
          inputType: 'video',
          fileReference: `/uploads/${file.filename}`,
          originalFilename: file.originalname,
          status: 'completed',
          totalObjects: aiResult.unique_items_estimated,
          processingTimeMs: aiResult.processing_time_ms,
          annotatedImageUrl: aiResult.representative_frames_base64?.[0],
          categoryDistribution: aiResult.category_distribution,
        });
        await session.save();

        const savedDetections = [];
        const savedWasteRecords = [];
        for (const item of aiResult.detections_summary) {
          const det = new Detection({
            sessionId: session._id,
            bbox: { x1: 0, y1: 0, x2: 100, y2: 100 },
            yoloLabel: item.subtype,
            yoloConfidence: item.average_confidence,
            cnnSubtype: item.subtype,
            cnnConfidence: item.average_confidence,
            finalClassification: item.subtype,
            wasteCategory: item.waste_category,
            reviewStatus: 'confirmed',
            confidenceScore: item.average_confidence,
            disposalRecommendation: item.recommendation,
          });
          await det.save();
          savedDetections.push(det);

          const wr = createWasteRecordDoc(
            session,
            {
              bbox: { x1: 0, y1: 0, x2: 100, y2: 100 },
              yolo_label: item.subtype,
              yolo_confidence: item.average_confidence,
              cnn_subtype: item.subtype,
              cnn_confidence: item.average_confidence,
              final_classification: item.subtype,
              waste_category: item.waste_category,
              review_status: 'confirmed',
              confidence_score: item.average_confidence,
              disposal_recommendation: item.recommendation,
            },
            req.user?.userId
          );
          await wr.save();
          savedWasteRecords.push(wr);
        }

        res.status(201).json({
          session,
          detections: savedDetections,
          wasteRecords: savedWasteRecords,
          aiResult,
        });
        return;
      }

      if (inputType === 'webcam_frame' && req.body.imageBase64) {
        // Process base64 frame from webcam stream
        const base64Data = req.body.imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        aiResult = await aiClient.predictFrame(buffer, 0, confidence);

        // For live webcam stream, optionally save session if saveSession is true
        if (req.body.saveSession === 'true' || req.body.saveSession === true) {
          const session = new DetectionSession({
            userId: req.user ? req.user.userId : undefined,
            inputType: 'webcam',
            status: 'completed',
            totalObjects: aiResult.total_objects,
            processingTimeMs: aiResult.processing_time_ms,
            annotatedImageUrl: aiResult.annotated_frame_base64,
          });
          await session.save();

          const savedDetections = [];
          const savedWasteRecords = [];
          for (const d of aiResult.detections) {
            const det = new Detection({
              sessionId: session._id,
              bbox: d.bbox,
              yoloLabel: d.yolo_label,
              yoloConfidence: d.yolo_confidence,
              cnnSubtype: d.cnn_subtype,
              cnnConfidence: d.cnn_confidence,
              cnnProbabilities: d.cnn_probabilities,
              finalClassification: d.final_classification,
              wasteCategory: d.waste_category,
              reviewStatus: d.review_status,
              confidenceScore: d.confidence_score,
              disposalRecommendation: {
                detectedItem: d.disposal_recommendation?.detected_item || d.final_classification,
                wasteCategory: d.disposal_recommendation?.waste_category || d.waste_category,
                suggestedDisposal: d.disposal_recommendation?.suggested_disposal || 'Recycle',
                preparationInstructions: d.disposal_recommendation?.preparation_instructions || [],
                recyclingEligibility: d.disposal_recommendation?.recycling_eligibility ?? true,
                confidenceScore: d.disposal_recommendation?.confidence_score || d.confidence_score,
                reason: d.disposal_recommendation?.reason || '',
                localRulesNotice: d.disposal_recommendation?.local_rules_notice || '',
              },
            });
            await det.save();
            savedDetections.push(det);

            const wr = createWasteRecordDoc(session, d, req.user?.userId);
            await wr.save();
            savedWasteRecords.push(wr);
          }

          res.status(201).json({ session, detections: savedDetections, wasteRecords: savedWasteRecords, aiResult });
          return;
        }

        res.json({ aiResult });
        return;
      }

      // Default: Image file upload
      if (!file) {
        res.status(400).json({ error: 'Image file required' });
        return;
      }

      aiResult = await aiClient.predictImage(file.path, confidence);

      const session = new DetectionSession({
        userId: req.user ? req.user.userId : undefined,
        inputType: 'image',
        fileReference: `/uploads/${file.filename}`,
        originalFilename: file.originalname,
        status: 'completed',
        totalObjects: aiResult.total_objects,
        processingTimeMs: aiResult.processing_time_ms,
        annotatedImageUrl: aiResult.annotated_image_base64,
        categoryDistribution: aiResult.category_distribution,
      });
      await session.save();

      // Persist detections and EcoTwin WasteRecords
      const savedDetections = [];
      const savedWasteRecords = [];
      for (const d of aiResult.detections) {
        const det = new Detection({
          sessionId: session._id,
          bbox: d.bbox,
          yoloLabel: d.yolo_label,
          yoloConfidence: d.yolo_confidence,
          cnnSubtype: d.cnn_subtype,
          cnnConfidence: d.cnn_confidence,
          cnnProbabilities: d.cnn_probabilities,
          finalClassification: d.final_classification,
          wasteCategory: d.waste_category,
          reviewStatus: d.review_status,
          confidenceScore: d.confidence_score,
          disposalRecommendation: {
            detectedItem: d.disposal_recommendation?.detected_item || d.final_classification,
            wasteCategory: d.disposal_recommendation?.waste_category || d.waste_category,
            suggestedDisposal: d.disposal_recommendation?.suggested_disposal || 'Recycle',
            preparationInstructions: d.disposal_recommendation?.preparation_instructions || [],
            recyclingEligibility: d.disposal_recommendation?.recycling_eligibility ?? true,
            confidenceScore: d.disposal_recommendation?.confidence_score || d.confidence_score,
            reason: d.disposal_recommendation?.reason || '',
            localRulesNotice: d.disposal_recommendation?.local_rules_notice || '',
          },
        });
        await det.save();
        savedDetections.push(det);

        const wr = createWasteRecordDoc(session, d, req.user?.userId);
        await wr.save();
        savedWasteRecords.push(wr);
      }

      res.status(201).json({
        session,
        detections: savedDetections,
        wasteRecords: savedWasteRecords,
        annotatedImage: aiResult.annotated_image_base64,
        processingTimeMs: aiResult.processing_time_ms,
        yoloModel: aiResult.yolo_model_name,
        cnnModel: aiResult.cnn_model_name,
      });
    } catch (err: any) {
      console.error('[Detection Error]', err);
      res.status(500).json({ error: err.message || 'Detection processing failed' });
    }
  }
);

// List sessions with search and filters
detectionRouter.get('/', optionalAuthenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const category = req.query.category as string;
    const search = req.query.search as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const query: any = {};
    if (req.user) {
      query.userId = req.user.userId;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    let sessionIdsFromDetections: any[] | null = null;
    if (category || search) {
      const detQuery: any = {};
      if (category && category !== 'All') {
        detQuery.wasteCategory = category;
      }
      if (search) {
        detQuery.$or = [
          { finalClassification: { $regex: search, $options: 'i' } },
          { yoloLabel: { $regex: search, $options: 'i' } },
        ];
      }
      const matchingDetections = await Detection.find(detQuery).distinct('sessionId');
      sessionIdsFromDetections = matchingDetections;
      query._id = { $in: sessionIdsFromDetections };
    }

    const total = await DetectionSession.countDocuments(query);
    const sessions = await DetectionSession.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      sessions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get session details and its detections & EcoTwin waste records
detectionRouter.get('/:id', optionalAuthenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const session = await DetectionSession.findById(req.params.id);
    if (!session) {
      res.status(404).json({ error: 'Detection session not found' });
      return;
    }

    const detections = await Detection.find({ sessionId: session._id });
    const wasteRecords = await WasteRecord.find({ sessionId: session._id });
    res.json({ session, detections, wasteRecords });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete detection session
detectionRouter.delete('/:id', optionalAuthenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const session = await DetectionSession.findById(req.params.id);
    if (!session) {
      res.status(404).json({ error: 'Detection session not found' });
      return;
    }

    await Detection.deleteMany({ sessionId: session._id });
    await DetectionSession.findByIdAndDelete(req.params.id);

    res.json({ message: 'Detection session and related records deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Export session data as JSON or CSV
detectionRouter.get('/:id/export', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const format = req.query.format || 'json';
    const session = await DetectionSession.findById(req.params.id);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const detections = await Detection.find({ sessionId: session._id });

    if (format === 'csv') {
      let csv = 'Item ID,Classification,Category,YOLO Conf,CNN Conf,Final Conf,Review Status,Recyclable,Disposal Method\n';
      detections.forEach((d) => {
        csv += `"${d._id}","${d.finalClassification}","${d.wasteCategory}",${d.yoloConfidence},${d.cnnConfidence},${d.confidenceScore},"${d.reviewStatus}",${d.disposalRecommendation.recyclingEligibility},"${d.disposalRecommendation.suggestedDisposal}"\n`;
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=ecovision-session-${session._id}.csv`);
      res.send(csv);
      return;
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=ecovision-session-${session._id}.json`);
    res.json({ session, detections });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
