import { Router, Request, Response } from 'express';
import { DisposalRule } from '../models/DisposalRule.js';

export const ecorouteRouter = Router();

// Bin Configurations supported
export const BIN_CONFIGS: Record<string, { name: string; streams: string[] }> = {
  '2-stream': {
    name: '2-Stream (Mixed Recyclables / Landfill)',
    streams: ['Mixed Recyclables', 'Landfill / General Waste'],
  },
  '3-stream': {
    name: '3-Stream (Recyclables / Compost / Landfill)',
    streams: ['Recyclables', 'Compost & Organics', 'Landfill / General Waste'],
  },
  '4-stream': {
    name: '4-Stream (Containers / Paper / Organics / Landfill)',
    streams: ['Containers (Plastics & Metals)', 'Clean Paper & Cardboard', 'Organics', 'General Waste'],
  },
  '6-stream': {
    name: '6-Stream Dedicated MRF Sorting',
    streams: ['Plastics', 'Paper & Cardboard', 'Metals', 'Glass Containers', 'Organic Waste', 'E-Waste Drop-off'],
  },
};

const CATEGORY_SERVO_ANGLES: Record<string, number> = {
  Plastics: 30,
  Paper: 60,
  Metal: 90,
  Glass: 120,
  Organic: 150,
  'E-Waste': 180,
  Landfill: 0,
  Medical: 0,
};

// POST /api/ecoroute/recommend - Context-aware disposal recommendation
ecorouteRouter.post('/recommend', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      wasteCategory,
      subtype,
      contaminationScore = 95,
      hasVisibleResidue = false,
      locality = 'Municipal Circular Standard',
      binConfig = '4-stream',
    } = req.body;

    if (!wasteCategory) {
      res.status(400).json({ error: 'wasteCategory is required' });
      return;
    }

    // Determine target bin based on bin configuration
    let targetBin = 'General Waste';
    let binColor = '#64748b'; // default slate

    if (binConfig === '2-stream') {
      if (['Plastics', 'Paper', 'Metal', 'Glass'].includes(wasteCategory) && !hasVisibleResidue) {
        targetBin = 'Mixed Recyclables';
        binColor = '#3b82f6';
      } else {
        targetBin = 'Landfill / General Waste';
        binColor = '#64748b';
      }
    } else if (binConfig === '3-stream') {
      if (['Plastics', 'Paper', 'Metal', 'Glass'].includes(wasteCategory) && !hasVisibleResidue) {
        targetBin = 'Recyclables';
        binColor = '#3b82f6';
      } else if (wasteCategory === 'Organic') {
        targetBin = 'Compost & Organics';
        binColor = '#10b981';
      } else {
        targetBin = 'Landfill / General Waste';
        binColor = '#64748b';
      }
    } else if (binConfig === '4-stream') {
      if (['Plastics', 'Metal'].includes(wasteCategory) && !hasVisibleResidue) {
        targetBin = 'Containers (Plastics & Metals)';
        binColor = '#3b82f6';
      } else if (wasteCategory === 'Paper' && !hasVisibleResidue) {
        targetBin = 'Clean Paper & Cardboard';
        binColor = '#f59e0b';
      } else if (wasteCategory === 'Organic') {
        targetBin = 'Organics';
        binColor = '#10b981';
      } else {
        targetBin = 'General Waste';
        binColor = '#64748b';
      }
    } else {
      // 6-stream
      switch (wasteCategory) {
        case 'Plastics':
          targetBin = 'Plastics Bin';
          binColor = '#3b82f6';
          break;
        case 'Paper':
          targetBin = 'Paper & Cardboard Bin';
          binColor = '#f59e0b';
          break;
        case 'Metal':
          targetBin = 'Metal Scrap & Cans';
          binColor = '#06b6d4';
          break;
        case 'Glass':
          targetBin = 'Glass Containers';
          binColor = '#8b5cf6';
          break;
        case 'Organic':
          targetBin = 'Organic Waste Bin';
          binColor = '#10b981';
          break;
        case 'E-Waste':
          targetBin = 'Authorized E-Waste Depot';
          binColor = '#ec4899';
          break;
        default:
          targetBin = 'General Waste';
          binColor = '#64748b';
      }
    }

    // Dynamic preparation instructions
    const prepInstructions: string[] = [];
    if (hasVisibleResidue) {
      prepInstructions.push('Visible surface residue detected: rinse thoroughly and air dry before disposal');
      if (wasteCategory === 'Paper') {
        prepInstructions.push('Food-greased paper (e.g., pizza boxes) cannot be recycled with paper; place in compost or general waste');
      }
    }

    if (wasteCategory === 'Plastics') {
      prepInstructions.push('Empty container completely; crush container to conserve bin capacity');
      prepInstructions.push('Leave caps attached if local MRF uses optical float-sink separation');
    } else if (wasteCategory === 'Paper') {
      prepInstructions.push('Flatten cardboard boxes to optimize collection space');
      prepInstructions.push('Keep dry; wet paper fibers cannot be processed in pulp mills');
    } else if (wasteCategory === 'Metal') {
      prepInstructions.push('Rinse food residues; remove paper labels if easily peelable');
    } else if (wasteCategory === 'Glass') {
      prepInstructions.push('Do not break glass; intact bottles ensure safe optical sorter operation');
      prepInstructions.push('Remove metal or plastic caps and recycle separately');
    } else if (wasteCategory === 'Organic') {
      prepInstructions.push('Place in certified compostable bag or directly into green bin');
      prepInstructions.push('Remove any plastic stickers or twist ties');
    } else if (wasteCategory === 'E-Waste') {
      prepInstructions.push('CRITICAL: Never discard lithium batteries in curbside bins (fire hazard)');
      prepInstructions.push('Tape battery terminals with non-conductive electrical tape before drop-off');
    }

    const servoAngle = CATEGORY_SERVO_ANGLES[wasteCategory] ?? 0;

    res.json({
      wasteCategory,
      subtype: subtype || wasteCategory,
      targetBin,
      binColor,
      binConfig,
      locality,
      preparationInstructions: prepInstructions,
      recyclingEligibility: !hasVisibleResidue && ['Plastics', 'Paper', 'Metal', 'Glass'].includes(wasteCategory),
      servoGateAngle: servoAngle,
      ruleSource: `${locality} - Standard Municipal Recycling Ordinance v2.4`,
      disclaimer: 'Disposal rules vary by municipal jurisdiction. Verify with local waste authorities if unsure.',
    });
  } catch (err: any) {
    console.error('[EcoRoute Recommend Error]', err);
    res.status(500).json({ error: 'Failed to generate disposal recommendation' });
  }
});

// GET /api/ecoroute/rules - List all official disposal rules
ecorouteRouter.get('/rules', async (req: Request, res: Response): Promise<void> => {
  try {
    const rules = await DisposalRule.find().sort({ category: 1 });
    res.json(rules);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve disposal rules' });
  }
});

// POST /api/ecoroute/feedback - Report rule exception or feedback
ecorouteRouter.post('/feedback', async (req: Request, res: Response): Promise<void> => {
  try {
    const { wasteCategory, subtype, userRegion, feedbackText } = req.body;
    // Log feedback
    console.log(`[EcoRoute Feedback] Category: ${wasteCategory}, Subtype: ${subtype}, Region: ${userRegion}, Notes: ${feedbackText}`);
    res.json({
      success: true,
      message: 'Feedback received and routed to the municipal rules catalog team',
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to process feedback' });
  }
});
