import mongoose, { Schema, Document } from 'mongoose';

export interface IDisposalRule extends Document {
  wasteCategory: string;
  itemSubtype: string;
  disposalMethod: string;
  preparationInstructions: string[];
  applicableRegion: string;
  recyclingEligibility: boolean;
  reason: string;
  ruleVersion: string;
  createdAt: Date;
  updatedAt: Date;
}

const DisposalRuleSchema = new Schema<IDisposalRule>(
  {
    wasteCategory: { type: String, required: true, index: true },
    itemSubtype: { type: String, required: true, unique: true, index: true },
    disposalMethod: { type: String, required: true },
    preparationInstructions: [{ type: String, required: true }],
    applicableRegion: { type: String, default: 'Global / Municipal MRF Standard' },
    recyclingEligibility: { type: Boolean, required: true },
    reason: { type: String, required: true },
    ruleVersion: { type: String, default: '1.0' },
  },
  { timestamps: true }
);

export const DisposalRule = mongoose.model<IDisposalRule>('DisposalRule', DisposalRuleSchema);
