import mongoose, { Schema, Document } from 'mongoose';

export interface IDetectionSession extends Document {
  userId?: mongoose.Types.ObjectId;
  inputType: 'image' | 'video' | 'webcam';
  fileReference?: string;
  originalFilename?: string;
  status: 'completed' | 'processing' | 'failed';
  totalObjects: number;
  processingTimeMs: number;
  annotatedImageUrl?: string;
  categoryDistribution: Map<string, number>;
  hardwareSorted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DetectionSessionSchema = new Schema<IDetectionSession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    inputType: { type: String, enum: ['image', 'video', 'webcam'], required: true },
    fileReference: { type: String },
    originalFilename: { type: String },
    status: { type: String, enum: ['completed', 'processing', 'failed'], default: 'completed' },
    totalObjects: { type: Number, default: 0, index: true },
    processingTimeMs: { type: Number, default: 0 },
    annotatedImageUrl: { type: String },
    categoryDistribution: { type: Map, of: Number, default: {} },
    hardwareSorted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

DetectionSessionSchema.index({ createdAt: -1 });

export const DetectionSession = mongoose.model<IDetectionSession>('DetectionSession', DetectionSessionSchema);
