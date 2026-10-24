/**
 * Standard Waste Categories & Default Mapping Configuration
 */

export const WASTE_CATEGORIES = [
  'Plastic',
  'Paper and cardboard',
  'Metal',
  'Glass',
  'Organic waste',
  'Electronic waste',
  'Other or mixed waste',
  'Unknown or needs review',
] as const;

export type WasteCategory = (typeof WASTE_CATEGORIES)[number];

export interface SubtypeDefinition {
  subtype: string;
  category: WasteCategory;
  recyclable: boolean;
  defaultDisposal: string;
  preparation: string[];
  reason: string;
}

export const SUBTYPE_REGISTRY: Record<string, SubtypeDefinition> = {
  'plastic bottle': {
    subtype: 'plastic bottle',
    category: 'Plastic',
    recyclable: true,
    defaultDisposal: 'Recycle bin (Plastic stream #1 PET / #2 HDPE)',
    preparation: ['Empty completely', 'Rinse residues', 'Crush bottle', 'Replace cap if locally accepted'],
    reason: 'Rigid PET and HDPE bottles have high industrial demand for mechanical recycling.',
  },
  'plastic packaging': {
    subtype: 'plastic packaging',
    category: 'Plastic',
    recyclable: false,
    defaultDisposal: 'General waste / Soft plastic collection point',
    preparation: ['Check resin code', 'Separate non-recyclable multi-layer films', 'Clean of organic food grease'],
    reason: 'Multi-layer and flexible films can jam municipal MRF sorters unless brought to specialized film drop-offs.',
  },
  'paper sheet': {
    subtype: 'paper sheet',
    category: 'Paper and cardboard',
    recyclable: true,
    defaultDisposal: 'Paper recycling bin',
    preparation: ['Keep clean and dry', 'Remove tape and metal clips if possible'],
    reason: 'Cellulose fibers can be re-pulped up to 5-7 times into new paper products.',
  },
  cardboard: {
    subtype: 'cardboard',
    category: 'Paper and cardboard',
    recyclable: true,
    defaultDisposal: 'Cardboard & paper bin',
    preparation: ['Flatten boxes to conserve bin space', 'Remove packing styrofoam and excessive tape', 'Keep dry from rain'],
    reason: 'Corrugated cardboard is among the highest-yield recyclable commodities globally.',
  },
  'metal can': {
    subtype: 'metal can',
    category: 'Metal',
    recyclable: true,
    defaultDisposal: 'Metals & cans recycling bin',
    preparation: ['Empty liquids', 'Quick rinse', 'No need to crush aluminum cans if MRFs use eddy currents'],
    reason: 'Aluminum and tin-plated steel are infinitely recyclable with 95% energy savings over virgin extraction.',
  },
  'glass bottle': {
    subtype: 'glass bottle',
    category: 'Glass',
    recyclable: true,
    defaultDisposal: 'Glass recycling depot / Bottle bank',
    preparation: ['Rinse cleanly', 'Separate metal caps or corks', 'Sort by color (clear, green, amber) if required'],
    reason: 'Container glass is 100% infinitely recyclable without quality degradation.',
  },
  'food scraps': {
    subtype: 'food scraps',
    category: 'Organic waste',
    recyclable: false,
    defaultDisposal: 'Municipal compost / Green organics bin / Bokashi',
    preparation: ['Remove all stickers, plastic wraps, and ties', 'Do not contaminate with non-biodegradable packaging'],
    reason: 'Organics decompose anaerobically in landfills producing methane; composting sequesters soil carbon.',
  },
  'electronic waste': {
    subtype: 'electronic waste',
    category: 'Electronic waste',
    recyclable: true,
    defaultDisposal: 'Authorized e-waste drop-off center / Retail takeback',
    preparation: ['Remove external batteries if detachable', 'Do not place in curbside bins', 'Wipe personal data if storage device'],
    reason: 'Contains hazardous heavy metals (lead, cadmium) and critical precious metals (gold, copper) needing specialized extraction.',
  },
  'other waste': {
    subtype: 'other waste',
    category: 'Other or mixed waste',
    recyclable: false,
    defaultDisposal: 'Residual / General municipal solid waste',
    preparation: ['Bag securely to prevent litter dispersal'],
    reason: 'Composite materials, soiled items, or unrecognized objects cannot be safely processed in single-stream recycling.',
  },
};

export const COLOR_PALETTE_BY_CATEGORY: Record<WasteCategory, { bg: string; text: string; border: string; hex: string }> = {
  Plastic: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/30', hex: '#f59e0b' },
  'Paper and cardboard': { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/30', hex: '#3b82f6' },
  Metal: { bg: 'bg-cyan-500/10', text: 'text-cyan-500', border: 'border-cyan-500/30', hex: '#06b6d4' },
  Glass: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/30', hex: '#10b981' },
  'Organic waste': { bg: 'bg-lime-500/10', text: 'text-lime-500', border: 'border-lime-500/30', hex: '#84cc16' },
  'Electronic waste': { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/30', hex: '#a855f7' },
  'Other or mixed waste': { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30', hex: '#64748b' },
  'Unknown or needs review': { bg: 'bg-rose-500/10', text: 'text-rose-500', border: 'border-rose-500/30', hex: '#f43f5e' },
};

export const CATEGORY_COLORS: Record<string, string> = {
  Plastics: '#3b82f6',
  Plastic: '#3b82f6',
  Paper: '#f59e0b',
  'Paper and cardboard': '#f59e0b',
  Metal: '#06b6d4',
  Glass: '#10b981',
  Organic: '#84cc16',
  'Organic waste': '#84cc16',
  'E-Waste': '#a855f7',
  'Electronic waste': '#a855f7',
  Landfill: '#64748b',
  'Other or mixed waste': '#64748b',
};

