import mongoose, { Schema, Document } from 'mongoose';

export interface ILifecycleEvent {
  eventType: string;
  previousStatus: string;
  newStatus: string;
  actor: string;
  timestamp: Date;
  note?: string;
}

export interface ICorrection {
  originalPrediction: string;
  originalCategory: string;
  correctedPrediction: string;
  correctedCategory: string;
  reason: string;
  reviewer: string;
  timestamp: Date;
}

export interface IWasteRecord extends Document {
  recordId: string; // EcoTwin Digital Waste Identity (e.g. ECO-4821)
  sessionId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  bbox: { x1: number; y1: number; x2: number; y2: number };
  yoloLabel: string;
  yoloConfidence: number;
  cnnSubtype: string;
  cnnConfidence: number;
  cnnProbabilities: Map<string, number>;
  finalClassification: string;
  wasteCategory: string;
  reviewStatus: 'confirmed' | 'needs_review' | 'disputed' | 'unverified';
  lifecycleStatus: 'detected' | 'classified' | 'needs_review' | 'recommendation_generated' | 'action_confirmed' | 'closed';
  modelAgreement: 'full_agreement' | 'refinement' | 'disputed' | 'low_confidence';
  reviewPriority: 'none' | 'low' | 'medium' | 'high' | 'critical';
  confidenceScore: number;
  contaminationAssessment: {
    hasVisibleResidue: boolean;
    residueType: string;
    cleanlinessScore: number;
    supported: boolean;
    note: string;
  };
  segregationReadiness: {
    score: number;
    factors: {
      confidenceFactor?: number;
      agreementFactor?: number;
      cleanlinessFactor?: number;
    };
    rating: string;
  };
  disposalRecommendation: {
    detectedItem: string;
    wasteCategory: string;
    suggestedDisposal: string;
    preparationInstructions: string[];
    recyclingEligibility: boolean;
    confidenceScore: number;
    reason: string;
    localRulesNotice: string;
    binType?: string;
    binColor?: string;
    applicableRegion?: string;
    ruleSource?: string;
  };
  lifecycleEvents: ILifecycleEvent[];
  corrections: ICorrection[];
  actionConfirmed: boolean;
  userConfirmedAction?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WasteRecordSchema = new Schema<IWasteRecord>(
  {
    recordId: { type: String, required: true, unique: true, index: true },
    sessionId: { type: Schema.Types.ObjectId, ref: 'DetectionSession', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    bbox: {
      x1: { type: Number, required: true },
      y1: { type: Number, required: true },
      x2: { type: Number, required: true },
      y2: { type: Number, required: true },
    },
    yoloLabel: { type: String, required: true },
    yoloConfidence: { type: Number, required: true },
    cnnSubtype: { type: String, required: true },
    cnnConfidence: { type: Number, required: true },
    cnnProbabilities: { type: Map, of: Number, default: {} },
    finalClassification: { type: String, required: true, index: true },
    wasteCategory: { type: String, required: true, index: true },
    reviewStatus: {
      type: String,
      enum: ['confirmed', 'needs_review', 'disputed', 'unverified'],
      default: 'confirmed',
      index: true,
    },
    lifecycleStatus: {
      type: String,
      enum: ['detected', 'classified', 'needs_review', 'recommendation_generated', 'action_confirmed', 'closed'],
      default: 'recommendation_generated',
      index: true,
    },
    modelAgreement: {
      type: String,
      enum: ['full_agreement', 'refinement', 'disputed', 'low_confidence'],
      default: 'full_agreement',
    },
    reviewPriority: {
      type: String,
      enum: ['none', 'low', 'medium', 'high', 'critical'],
      default: 'none',
      index: true,
    },
    confidenceScore: { type: Number, required: true },
    contaminationAssessment: {
      hasVisibleResidue: { type: Boolean, default: false },
      residueType: { type: String, default: 'none' },
      cleanlinessScore: { type: Number, default: 95.0 },
      supported: { type: Boolean, default: true },
      note: { type: String, default: 'Optical inspection completed' },
    },
    segregationReadiness: {
      score: { type: Number, default: 90.0 },
      factors: { type: Map, of: Number, default: {} },
      rating: { type: String, default: 'High' },
    },
    disposalRecommendation: {
      detectedItem: { type: String },
      wasteCategory: { type: String },
      suggestedDisposal: { type: String },
      preparationInstructions: [{ type: String }],
      recyclingEligibility: { type: Boolean },
      confidenceScore: { type: Number },
      reason: { type: String },
      localRulesNotice: { type: String },
      binType: { type: String, default: 'Standard Recycling' },
      binColor: { type: String, default: '#10b981' },
      applicableRegion: { type: String, default: 'Global MRF Standards' },
      ruleSource: { type: String, default: 'Municipal Circular Economy Standard 2026' },
    },
    lifecycleEvents: [
      {
        eventType: { type: String, required: true },
        previousStatus: { type: String, required: true },
        newStatus: { type: String, required: true },
        actor: { type: String, default: 'system' },
        timestamp: { type: Date, default: Date.now },
        note: { type: String },
      },
    ],
    corrections: [
      {
        originalPrediction: { type: String, required: true },
        originalCategory: { type: String, required: true },
        correctedPrediction: { type: String, required: true },
        correctedCategory: { type: String, required: true },
        reason: { type: String, required: true },
        reviewer: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    actionConfirmed: { type: Boolean, default: false, index: true },
    userConfirmedAction: { type: String },
  },
  { timestamps: true }
);

WasteRecordSchema.index({ wasteCategory: 1, createdAt: -1 });
WasteRecordSchema.index({ reviewStatus: 1, lifecycleStatus: 1 });

export const WasteRecord = mongoose.model<IWasteRecord>('WasteRecord', WasteRecordSchema);
