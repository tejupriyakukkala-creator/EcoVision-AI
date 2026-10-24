/**
 * EcoVision AI - Core Waste Detection, Classification & EcoIntelligence Types
 */

export type WasteCategory =
  | 'Plastic'
  | 'Paper and cardboard'
  | 'Metal'
  | 'Glass'
  | 'Organic waste'
  | 'Electronic waste'
  | 'Other or mixed waste'
  | 'Unknown or needs review';

export type ReviewStatus = 'confirmed' | 'needs_review' | 'disputed' | 'unverified';

export type LifecycleStatus =
  | 'detected'
  | 'classified'
  | 'needs_review'
  | 'recommendation_generated'
  | 'action_confirmed'
  | 'closed';

export type InputType = 'image' | 'video' | 'webcam';

export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface YoloDetection {
  box: BoundingBox;
  confidence: number;
  classId: number;
  label: string;
}

export interface CnnClassification {
  topSubtype: string;
  confidence: number;
  probabilities: Record<string, number>;
}

export interface ContaminationAssessment {
  hasVisibleResidue: boolean;
  residueType?: 'food' | 'liquid' | 'mixed' | 'damaged' | 'none';
  cleanlinessScore: number; // 0 - 100
  supported: boolean;
  note: string;
}

export interface SegregationReadiness {
  score: number; // 0 - 100
  factors: {
    confidenceFactor: number;
    agreementFactor: number;
    cleanlinessFactor: number;
  };
  rating: 'High' | 'Medium' | 'Low' | 'Requires Audit';
}

export interface DisposalRecommendation {
  detectedItem: string;
  wasteCategory: WasteCategory;
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
}

export interface FusedDetection {
  id: string;
  recordId?: string; // EcoTwin Digital Waste Identity (e.g. ECO-8921)
  bbox: BoundingBox;
  yoloLabel: string;
  yoloConfidence: number;
  cnnSubtype: string;
  cnnConfidence: number;
  cnnProbabilities: Record<string, number>;
  finalClassification: string;
  wasteCategory: WasteCategory;
  reviewStatus: ReviewStatus;
  lifecycleStatus?: LifecycleStatus;
  confidenceScore: number;
  modelAgreement: 'full_agreement' | 'refinement' | 'disputed' | 'low_confidence';
  contaminationAssessment: ContaminationAssessment;
  segregationReadiness: SegregationReadiness;
  disposalRecommendation: DisposalRecommendation;
}

export interface WasteLifecycleEvent {
  eventType: string;
  previousStatus: LifecycleStatus;
  newStatus: LifecycleStatus;
  actor: string;
  timestamp: string;
  note?: string;
}

export interface ReviewCorrection {
  id: string;
  recordId: string;
  originalPrediction: string;
  originalCategory: WasteCategory;
  correctedPrediction: string;
  correctedCategory: WasteCategory;
  reason: string;
  reviewer: string;
  timestamp: string;
}

export interface EcoTwinRecord {
  id: string;
  recordId: string;
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  bbox: BoundingBox;
  yoloLabel: string;
  yoloConfidence: number;
  cnnSubtype: string;
  cnnConfidence: number;
  finalClassification: string;
  wasteCategory: WasteCategory;
  reviewStatus: ReviewStatus;
  lifecycleStatus: LifecycleStatus;
  confidenceScore: number;
  modelAgreement: string;
  contaminationAssessment: ContaminationAssessment;
  segregationReadiness: SegregationReadiness;
  disposalRecommendation: DisposalRecommendation;
  lifecycleEvents: WasteLifecycleEvent[];
  corrections: ReviewCorrection[];
  actionConfirmed: boolean;
  userConfirmedAction?: string;
}

export interface DetectionSessionSummary {
  id: string;
  userId?: string;
  inputType: InputType;
  originalFilename?: string;
  fileReference?: string;
  annotatedImageUrl?: string;
  totalObjects: number;
  categoryDistribution: Record<WasteCategory, number>;
  detections: FusedDetection[];
  processingTimeMs: number;
  createdAt: string;
  hardwareSorted?: boolean;
  status: 'completed' | 'processing' | 'failed';
}

export interface EcoPulseForecast {
  date: string;
  category: WasteCategory;
  predictedCount: number;
  lowerBound: number;
  upperBound: number;
  baselineMethod: string;
  isObserved: boolean;
}

export interface WasteIntelligenceInsight {
  id: string;
  title: string;
  type: 'segregation_improvement' | 'material_surge' | 'recycling_opportunity' | 'hazard_alert';
  message: string;
  supportingData: {
    metric: string;
    value: string | number;
    count: number;
    dateRange: string;
  };
  actionableStep: string;
  severity: 'low' | 'medium' | 'high';
}

export interface UserSustainabilityAction {
  id: string;
  recordId: string;
  userId?: string;
  itemSubtype: string;
  wasteCategory: WasteCategory;
  actionType: string;
  confirmedAt: string;
  pointsEarned: number;
  verified: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  iconName: string;
  unlockedAt?: string;
  progress: number;
  maxProgress: number;
  badgeLevel: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  category: WasteCategory;
}

export interface EcoLoopProfile {
  points: number;
  level: number;
  levelName: string;
  nextLevelPoints: number;
  confirmedActionsCount: number;
  achievements: Achievement[];
  recentTips: string[];
}
