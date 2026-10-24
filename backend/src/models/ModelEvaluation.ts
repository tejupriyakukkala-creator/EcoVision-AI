import mongoose, { Schema, Document } from 'mongoose';

export interface IModelEvaluation extends Document {
  modelVersion: string;
  datasetIdentifier: string;
  evaluationDate: Date;
  precision: number;
  recall: number;
  mAP50: number;
  mAP50_95: number;
  cnnAccuracy: number;
  cnnMacroF1: number;
  confusionMatrix: {
    labels: string[];
    matrix: number[][];
  };
  createdAt: Date;
}

const ModelEvaluationSchema = new Schema<IModelEvaluation>(
  {
    modelVersion: { type: String, required: true },
    datasetIdentifier: { type: String, required: true },
    evaluationDate: { type: Date, default: Date.now },
    precision: { type: Number, required: true },
    recall: { type: Number, required: true },
    mAP50: { type: Number, required: true },
    mAP50_95: { type: Number, required: true },
    cnnAccuracy: { type: Number, required: true },
    cnnMacroF1: { type: Number, required: true },
    confusionMatrix: {
      labels: [{ type: String }],
      matrix: [[{ type: Number }]],
    },
  },
  { timestamps: true }
);

export const ModelEvaluation = mongoose.model<IModelEvaluation>('ModelEvaluation', ModelEvaluationSchema);
