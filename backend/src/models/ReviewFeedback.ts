import mongoose, { Schema, Document } from 'mongoose';

export interface IReviewFeedback extends Document {
  recordId: string;
  originalPrediction: string;
  originalCategory: string;
  correctedPrediction: string;
  correctedCategory: string;
  reason: string;
  reviewer: string;
  reviewerId?: mongoose.Types.ObjectId;
  approvedForRetraining: boolean; // Must require admin verification before inclusion in datasets
  status: 'pending' | 'accepted' | 'rejected';
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewFeedbackSchema = new Schema<IReviewFeedback>(
  {
    recordId: { type: String, required: true, index: true },
    originalPrediction: { type: String, required: true },
    originalCategory: { type: String, required: true },
    correctedPrediction: { type: String, required: true },
    correctedCategory: { type: String, required: true },
    reason: { type: String, required: true },
    reviewer: { type: String, required: true },
    reviewerId: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedForRetraining: { type: Boolean, default: false, index: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'accepted',
    },
    adminNotes: { type: String },
  },
  { timestamps: true }
);

ReviewFeedbackSchema.index({ createdAt: -1 });

export const ReviewFeedback = mongoose.model<IReviewFeedback>('ReviewFeedback', ReviewFeedbackSchema);
