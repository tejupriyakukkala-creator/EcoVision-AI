import mongoose, { Schema, Document } from 'mongoose';

export interface IDetection extends Document {
  sessionId: mongoose.Types.ObjectId;
  bbox: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
  yoloLabel: string;
  yoloConfidence: number;
  cnnSubtype: string;
  cnnConfidence: number;
  cnnProbabilities: Map<string, number>;
  finalClassification: string;
  wasteCategory: string;
  reviewStatus: 'confirmed' | 'needs_review' | 'disputed' | 'unverified';
  confidenceScore: number;
  disposalRecommendation: {
    detectedItem: string;
    wasteCategory: string;
    suggestedDisposal: string;
    preparationInstructions: string[];
    recyclingEligibility: boolean;
    confidenceScore: number;
    reason: string;
    localRulesNotice: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const DetectionSchema = new Schema<IDetection>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'DetectionSession', required: true, index: true },
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
    confidenceScore: { type: Number, required: true },
    disposalRecommendation: {
      detectedItem: { type: String },
      wasteCategory: { type: String },
      suggestedDisposal: { type: String },
      preparationInstructions: [{ type: String }],
      recyclingEligibility: { type: Boolean },
      confidenceScore: { type: Number },
      reason: { type: String },
      localRulesNotice: { type: String },
    },
  },
  { timestamps: true }
);

DetectionSchema.index({ wasteCategory: 1, createdAt: -1 });

export const Detection = mongoose.model<IDetection>('Detection', DetectionSchema);
