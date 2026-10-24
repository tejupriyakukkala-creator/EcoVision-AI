import mongoose, { Schema, Document } from 'mongoose';

export interface IUserAction extends Document {
  userId: mongoose.Types.ObjectId;
  recordId: string; // References EcoTwin recordId (ECO-XXXX)
  actionType: 'segregated_correctly' | 'placed_in_bin' | 'composted' | 'e_waste_dropoff' | 'cleaned_and_recycled';
  confirmationStatus: 'confirmed' | 'pending' | 'rejected';
  pointsAwarded: number;
  verifiedOutcome: 'unverified' | 'community_verified' | 'facility_collected';
  disposalBinSelected?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserActionSchema = new Schema<IUserAction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    recordId: { type: String, required: true, index: true },
    actionType: {
      type: String,
      enum: ['segregated_correctly', 'placed_in_bin', 'composted', 'e_waste_dropoff', 'cleaned_and_recycled'],
      default: 'segregated_correctly',
    },
    confirmationStatus: {
      type: String,
      enum: ['confirmed', 'pending', 'rejected'],
      default: 'confirmed',
    },
    pointsAwarded: { type: Number, default: 25 },
    verifiedOutcome: {
      type: String,
      enum: ['unverified', 'community_verified', 'facility_collected'],
      default: 'unverified',
    },
    disposalBinSelected: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

// Compound unique index ensuring no duplicate reward for the same record and user
UserActionSchema.index({ userId: 1, recordId: 1 }, { unique: true });

export const UserAction = mongoose.model<IUserAction>('UserAction', UserActionSchema);
