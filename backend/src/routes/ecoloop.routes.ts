import { Router, Response } from 'express';
import { optionalAuthenticate, authenticate, AuthRequest } from '../middleware/auth.js';
import { UserAction } from '../models/UserAction.js';
import { WasteRecord } from '../models/WasteRecord.js';
import { QuizAttempt } from '../models/QuizAttempt.js';
import { User } from '../models/User.js';

export const ecoloopRouter = Router();

// Educational Quiz Questions Repository
const QUIZ_QUESTIONS = [
  {
    id: 'q1',
    category: 'Plastics',
    question: 'Why must plastic bottles be emptied and crushed before placing them into a recycling bin?',
    options: [
      'It changes the chemical composition of the plastic',
      'It prevents liquid contamination and maximizes collection truck volume capacity',
      'It helps the optical laser incinerate the plastic faster',
      'Only transparent bottles need to be crushed',
    ],
    correctOption: 1,
    explanation: 'Residual liquids contaminate paper streams, while crushed containers increase bulk density and reduce transportation carbon emissions.',
  },
  {
    id: 'q2',
    category: 'Paper',
    question: 'Can greasy cardboard pizza boxes be recycled with regular office paper and cardboard?',
    options: [
      'Yes, grease washes out during standard water pulping',
      'No, oil/grease bonds to fibers and ruins the recycling slurry; compost or discard greasy parts instead',
      'Only if bleached with chemical detergent first',
      'Yes, but only during summer months',
    ],
    correctOption: 1,
    explanation: 'Food oils cannot be separated from paper fibers during standard water-based pulping, creating oil spots that ruin new paper batches.',
  },
  {
    id: 'q3',
    category: 'E-Waste',
    question: 'Why should rechargeable lithium-ion batteries NEVER be tossed into curbside recycling bins?',
    options: [
      'They make bins too heavy for mechanical arms',
      'Compacting trucks crush them, puncturing cells and causing catastrophic battery fires',
      'They will demagnetize all surrounding aluminum cans',
      'They degrade into soil fertilizer too quickly',
    ],
    correctOption: 1,
    explanation: 'Damaged or compressed lithium batteries enter thermal runaway, creating hazardous fires in collection trucks and Material Recovery Facilities (MRFs).',
  },
  {
    id: 'q4',
    category: 'Glass',
    question: 'What is the correct preparation step for glass jars before curbside recycling?',
    options: [
      'Smash the jar into fine shards to save space',
      'Rinse out food residues, remove non-glass lids, and keep the jar intact',
      'Soak in acid for 24 hours',
      'Wrap in plastic bubble wrap before binning',
    ],
    correctOption: 1,
    explanation: 'Intact glass containers allow automated optical sorting machines to separate glass by color without hazardous broken shards.',
  },
];

// Pre-defined system achievements
const SYSTEM_ACHIEVEMENTS = [
  {
    id: 'first_action',
    title: 'First Step to Zero Waste',
    description: 'Confirmed your first waste segregation action in EcoVision.',
    points: 50,
    icon: 'Sparkles',
    target: 1,
  },
  {
    id: 'five_sorts',
    title: 'Consistent Recycler',
    description: 'Confirmed 5 responsible waste segregation actions.',
    points: 100,
    icon: 'Award',
    target: 5,
  },
  {
    id: 'ten_sorts',
    title: 'Waste Diversion Champion',
    description: 'Successfully segregated 10 items according to EcoRoute rules.',
    points: 250,
    icon: 'Trophy',
    target: 10,
  },
  {
    id: 'quiz_master',
    title: 'EcoScholar',
    description: 'Scored 100% on the EcoLoop waste intelligence quiz.',
    points: 150,
    icon: 'BookOpen',
    target: 1,
  },
];

// GET /api/ecoloop/profile - User gamification profile & stats
ecoloopRouter.get('/profile', optionalAuthenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      // Return guest profile
      res.json({
        userId: 'guest',
        name: 'Eco Guest',
        totalPoints: 50,
        level: 1,
        levelName: 'Eco Observer',
        actionsCount: 0,
        unlockedAchievements: [],
        recentActions: [],
      });
      return;
    }

    const user = await User.findById(userId);
    const actions = await UserAction.find({ userId }).sort({ createdAt: -1 });
    const quizAttempts = await QuizAttempt.find({ userId });

    const actionsCount = actions.length;
    const actionPoints = actions.reduce((sum, a) => sum + (a.pointsAwarded || 0), 0);
    const quizPoints = quizAttempts.reduce((sum, q) => sum + (q.pointsEarned || 0), 0);
    const totalPoints = actionPoints + quizPoints;

    // Calculate level
    let level = 1;
    let levelName = 'Eco Apprentice';
    if (totalPoints >= 500) {
      level = 4;
      levelName = 'Planetary Steward';
    } else if (totalPoints >= 250) {
      level = 3;
      levelName = 'Circularity Master';
    } else if (totalPoints >= 100) {
      level = 2;
      levelName = 'Segregation Specialist';
    }

    // Determine unlocked achievements
    const unlockedAchievements = SYSTEM_ACHIEVEMENTS.filter((ach) => {
      if (ach.id === 'first_action' && actionsCount >= 1) return true;
      if (ach.id === 'five_sorts' && actionsCount >= 5) return true;
      if (ach.id === 'ten_sorts' && actionsCount >= 10) return true;
      if (ach.id === 'quiz_master' && quizAttempts.some((q) => q.percentage === 100)) return true;
      return false;
    }).map((ach) => ({
      ...ach,
      unlockedAt: new Date().toISOString(),
    }));

    res.json({
      userId,
      name: user?.name || 'Recycler',
      totalPoints,
      level,
      levelName,
      actionsCount,
      unlockedAchievements,
      recentActions: actions.slice(0, 5),
    });
  } catch (err: any) {
    console.error('[EcoLoop Profile Error]', err);
    res.status(500).json({ error: 'Failed to retrieve EcoLoop profile' });
  }
});

// GET /api/ecoloop/actions - List user confirmed actions
ecoloopRouter.get('/actions', optionalAuthenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filter = req.user ? { userId: req.user.userId } : {};
    const actions = await UserAction.find(filter).sort({ createdAt: -1 }).limit(50);
    res.json(actions);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve actions' });
  }
});

// POST /api/ecoloop/actions - Record user-confirmed segregation action with DUPLICATE PREVENTION
ecoloopRouter.post('/actions', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { recordId, actionType = 'segregated_correctly', disposalBinSelected, notes } = req.body;

    if (!recordId) {
      res.status(400).json({ error: 'recordId is required to confirm action' });
      return;
    }

    // Check for duplicate reward claim on this record by this user
    const existingAction = await UserAction.findOne({ userId, recordId });
    if (existingAction) {
      res.status(409).json({
        error: 'Points already awarded for this detection record. Duplicate reward claims are prevented.',
        existingActionId: existingAction._id,
      });
      return;
    }

    // Check if WasteRecord exists
    const recordQuery = recordId.startsWith('ECO-') ? { recordId } : { _id: recordId };
    const wasteRecord = await WasteRecord.findOne(recordQuery);

    if (wasteRecord) {
      // Transition lifecycle status
      wasteRecord.lifecycleStatus = 'action_confirmed';
      wasteRecord.actionConfirmed = true;
      wasteRecord.userConfirmedAction = actionType;
      wasteRecord.lifecycleEvents.push({
        eventType: 'user_action_confirmed',
        previousStatus: wasteRecord.lifecycleStatus,
        newStatus: 'action_confirmed',
        actor: req.user?.email || 'authenticated_user',
        timestamp: new Date(),
        note: `User confirmed segregation into: ${disposalBinSelected || wasteRecord.wasteCategory}`,
      });
      await wasteRecord.save();
    }

    // Create UserAction record
    const pointsToAward = 25;
    const newAction = new UserAction({
      userId,
      recordId,
      actionType,
      confirmationStatus: 'confirmed',
      pointsAwarded: pointsToAward,
      verifiedOutcome: 'unverified', // Clear transparency: not claiming municipal certification without sensor tag
      disposalBinSelected,
      notes,
    });
    await newAction.save();

    res.status(201).json({
      message: 'Segregation action confirmed! 25 EcoPoints awarded.',
      action: newAction,
      pointsAwarded: pointsToAward,
    });
  } catch (err: any) {
    if (err.code === 11000) {
      res.status(409).json({ error: 'Duplicate action prevented: record already rewarded.' });
      return;
    }
    console.error('[EcoLoop Action Error]', err);
    res.status(500).json({ error: 'Failed to record segregation action' });
  }
});

// GET /api/ecoloop/achievements - Available achievements
ecoloopRouter.get('/achievements', async (req, res): Promise<void> => {
  res.json(SYSTEM_ACHIEVEMENTS);
});

// GET /api/ecoloop/learning - Learning tips & quiz questions
ecoloopRouter.get('/learning', async (req, res): Promise<void> => {
  // Strip correct answer for client side quiz taking
  const safeQuestions = QUIZ_QUESTIONS.map(({ id, category, question, options }) => ({
    id,
    category,
    question,
    options,
  }));

  res.json({
    tips: [
      {
        title: 'The Contamination Trap',
        content: 'A single unrinsed peanut butter jar can contaminate an entire bale of paper, turning hundreds of pounds of recyclable material into landfill trash.',
      },
      {
        title: 'Thermal Paper Warning',
        content: 'Grocery register receipts contain BPA coatings and cannot be recycled with standard paper. Throw receipts in general waste.',
      },
      {
        title: 'Caps On or Off?',
        content: 'Modern MRFs prefer plastic bottle caps screwed on tightly so they do not fall through the glass breaker screens during trommel sorting.',
      },
    ],
    quiz: safeQuestions,
  });
});

// POST /api/ecoloop/quiz-attempts - Submit quiz answers and score
ecoloopRouter.post('/quiz-attempts', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { answers } = req.body; // Array of { questionId, selectedOption }

    if (!Array.isArray(answers) || answers.length === 0) {
      res.status(400).json({ error: 'Answers array required' });
      return;
    }

    let correctCount = 0;
    const gradedAnswers = answers.map((ans) => {
      const q = QUIZ_QUESTIONS.find((item) => item.id === ans.questionId);
      const isCorrect = q ? q.correctOption === ans.selectedOption : false;
      if (isCorrect) correctCount++;
      return {
        questionId: ans.questionId,
        selectedOption: ans.selectedOption,
        correct: isCorrect,
        explanation: q?.explanation,
      };
    });

    const percentage = Math.round((correctCount / answers.length) * 100);
    const passed = percentage >= 70;
    const pointsEarned = passed ? 50 : 10;

    const attempt = new QuizAttempt({
      userId,
      category: 'General Waste Intelligence',
      score: correctCount,
      totalQuestions: answers.length,
      percentage,
      passed,
      pointsEarned,
      answers: gradedAnswers,
    });
    await attempt.save();

    res.json({
      score: correctCount,
      total: answers.length,
      percentage,
      passed,
      pointsEarned,
      gradedAnswers,
    });
  } catch (err: any) {
    console.error('[Quiz Attempt Error]', err);
    res.status(500).json({ error: 'Failed to grade quiz attempt' });
  }
});

// GET /api/ecoloop/leaderboard - Community leaderboard (opt-in)
ecoloopRouter.get('/leaderboard', async (req, res): Promise<void> => {
  try {
    const topActions = await UserAction.aggregate([
      { $group: { _id: '$userId', totalPoints: { $sum: '$pointsAwarded' }, actionsCount: { $sum: 1 } } },
      { $sort: { totalPoints: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo',
        },
      },
      { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          userId: '$_id',
          name: { $ifNull: ['$userInfo.name', 'Eco Recycler'] },
          totalPoints: 1,
          actionsCount: 1,
        },
      },
    ]);

    res.json(topActions);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve leaderboard' });
  }
});
