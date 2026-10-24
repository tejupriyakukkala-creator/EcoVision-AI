import mongoose, { Schema, Document } from 'mongoose';

export interface IQuizAttempt extends Document {
  userId: mongoose.Types.ObjectId;
  category: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  passed: boolean;
  pointsEarned: number;
  answers: Array<{
    questionId: string;
    selectedOption: number;
    correct: boolean;
  }>;
  createdAt: Date;
}

const QuizAttemptSchema = new Schema<IQuizAttempt>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: { type: String, required: true },
    score: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    percentage: { type: Number, required: true },
    passed: { type: Boolean, required: true },
    pointsEarned: { type: Number, default: 0 },
    answers: [
      {
        questionId: { type: String, required: true },
        selectedOption: { type: Number, required: true },
        correct: { type: Boolean, required: true },
      },
    ],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

QuizAttemptSchema.index({ userId: 1, createdAt: -1 });

export const QuizAttempt = mongoose.model<IQuizAttempt>('QuizAttempt', QuizAttemptSchema);
