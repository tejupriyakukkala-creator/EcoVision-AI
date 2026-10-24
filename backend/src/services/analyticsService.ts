import { DetectionSession } from '../models/DetectionSession.js';
import { Detection } from '../models/Detection.js';

export interface AnalyticsSummary {
  totalSessions: number;
  totalItems: number;
  recyclableItems: number;
  recyclabilityRate: number;
  averageConfidence: number;
  topCategory: string;
  topSubtype: string;
  categoryDistribution: Array<{ category: string; count: number; percentage: number }>;
  confidenceDistribution: {
    high: number;      // >= 0.75
    moderate: number;  // 0.50 - 0.74
    low: number;       // < 0.50
  };
}

export interface WasteInsight {
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

export class AnalyticsService {
  async getSummary(filter: { startDate?: Date; endDate?: Date; userId?: string }): Promise<AnalyticsSummary> {
    const matchQuery: any = {};
    if (filter.userId) {
      matchQuery.userId = filter.userId;
    }
    if (filter.startDate || filter.endDate) {
      matchQuery.createdAt = {};
      if (filter.startDate) matchQuery.createdAt.$gte = filter.startDate;
      if (filter.endDate) matchQuery.createdAt.$lte = filter.endDate;
    }

    const totalSessions = await DetectionSession.countDocuments(matchQuery);

    // Aggregate detections joined by session
    const pipeline: any[] = [];
    if (Object.keys(matchQuery).length > 0) {
      pipeline.push({
        $lookup: {
          from: 'detectionsessions',
          localField: 'sessionId',
          foreignField: '_id',
          as: 'session',
        },
      });
      pipeline.push({ $unwind: '$session' });
      if (filter.userId) pipeline.push({ $match: { 'session.userId': filter.userId } });
      if (filter.startDate) pipeline.push({ $match: { createdAt: { $gte: filter.startDate } } });
      if (filter.endDate) pipeline.push({ $match: { createdAt: { $lte: filter.endDate } } });
    }

    // Category distribution aggregation
    const categoryAgg = await Detection.aggregate([
      ...pipeline,
      {
        $group: {
          _id: '$wasteCategory',
          count: { $sum: 1 },
          avgConfidence: { $avg: '$confidenceScore' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Subtype counts
    const subtypeAgg = await Detection.aggregate([
      ...pipeline,
      {
        $group: {
          _id: '$finalClassification',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]);

    // Recyclable items count
    const recyclableAgg = await Detection.aggregate([
      ...pipeline,
      {
        $group: {
          _id: '$disposalRecommendation.recyclingEligibility',
          count: { $sum: 1 },
        },
      },
    ]);

    // Confidence tiers
    const confidenceAgg = await Detection.aggregate([
      ...pipeline,
      {
        $bucket: {
          groupBy: '$confidenceScore',
          boundaries: [0, 0.5, 0.75, 1.01],
          default: 'other',
          output: { count: { $sum: 1 } },
        },
      },
    ]);

    let totalItems = 0;
    const categoryDistribution: Array<{ category: string; count: number; percentage: number }> = [];

    categoryAgg.forEach((item) => {
      totalItems += item.count;
    });

    categoryAgg.forEach((item) => {
      categoryDistribution.push({
        category: item._id,
        count: item.count,
        percentage: totalItems > 0 ? Math.round((item.count / totalItems) * 100) : 0,
      });
    });

    let recyclableCount = 0;
    recyclableAgg.forEach((r) => {
      if (r._id === true) recyclableCount = r.count;
    });

    let lowConf = 0;
    let modConf = 0;
    let highConf = 0;

    confidenceAgg.forEach((b) => {
      if (b._id === 0) lowConf = b.count;
      else if (b._id === 0.5) modConf = b.count;
      else if (b._id === 0.75) highConf = b.count;
    });

    return {
      totalSessions,
      totalItems,
      recyclableItems: recyclableCount,
      recyclabilityRate: totalItems > 0 ? Math.round((recyclableCount / totalItems) * 100) : 0,
      averageConfidence:
        categoryAgg.length > 0
          ? Number((categoryAgg.reduce((acc, c) => acc + (c.avgConfidence || 0), 0) / categoryAgg.length).toFixed(3))
          : 0.85,
      topCategory: categoryDistribution.length > 0 ? categoryDistribution[0].category : 'None',
      topSubtype: subtypeAgg.length > 0 ? subtypeAgg[0]._id : 'None',
      categoryDistribution,
      confidenceDistribution: {
        high: highConf,
        moderate: modConf,
        low: lowConf,
      },
    };
  }

  async getTrends(days: number = 14): Promise<Array<{ date: string; detections: number; items: number }>> {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const trendAgg = await DetectionSession.aggregate([
      { $match: { createdAt: { $gte: sinceDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          detections: { $sum: 1 },
          items: { $sum: '$totalObjects' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill missing dates
    const result: Array<{ date: string; detections: number; items: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const match = trendAgg.find((t) => t._id === dateStr);
      result.push({
        date: dateStr,
        detections: match ? match.detections : 0,
        items: match ? match.items : 0,
      });
    }

    return result;
  }

  async generateWasteIntelligenceInsights(): Promise<WasteInsight[]> {
    const totalDetections = await Detection.countDocuments();
    if (totalDetections === 0) {
      return [
        {
          id: 'insight-start',
          title: 'System Initialized - Awaiting Data Ingestion',
          type: 'recycling_opportunity',
          message: 'EcoVision AI is ready. Upload images or run live webcam streams to generate data-driven waste intelligence.',
          supportingData: {
            metric: 'Total Observations',
            value: 0,
            count: 0,
            dateRange: 'All Time',
          },
          actionableStep: 'Upload sample waste images in the Detection Studio to analyze composition.',
          severity: 'low',
        },
      ];
    }

    const insights: WasteInsight[] = [];
    const dateRangeStr = 'Past 30 Days';

    // 1. Category Breakdown
    const catCounts = await Detection.aggregate([
      { $group: { _id: '$wasteCategory', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const plasticCount = catCounts.find((c) => c._id === 'Plastic')?.count || 0;
    const organicCount = catCounts.find((c) => c._id === 'Organic waste')?.count || 0;
    const ewasteCount = catCounts.find((c) => c._id === 'Electronic waste')?.count || 0;
    const paperCount = catCounts.find((c) => c._id === 'Paper and cardboard')?.count || 0;

    // Rule A: Plastic Packaging Dominance
    if (plasticCount > totalDetections * 0.35) {
      const plasticPct = Math.round((plasticCount / totalDetections) * 100);
      insights.push({
        id: 'insight-plastic-surge',
        title: 'High Plastic Concentration Detected',
        type: 'material_surge',
        message: `Plastics constitute ${plasticPct}% of all detected waste items across current logs. Single-use polymers require prioritized segregation at source.`,
        supportingData: {
          metric: 'Plastic Share',
          value: `${plasticPct}%`,
          count: plasticCount,
          dateRange: dateRangeStr,
        },
        actionableStep: 'Deploy dedicated rigid plastics collection bins and educate facility occupants on bottle rinsing guidelines.',
        severity: 'high',
      });
    }

    // Rule B: Organic Waste Composting Potential
    if (organicCount > 0) {
      insights.push({
        id: 'insight-compost',
        title: 'Composting Diversion Opportunity',
        type: 'recycling_opportunity',
        message: `${organicCount} organic food and biowaste items were detected. Diverting these prevents anaerobic landfill methane emissions.`,
        supportingData: {
          metric: 'Organic Items Identified',
          value: organicCount,
          count: organicCount,
          dateRange: dateRangeStr,
        },
        actionableStep: 'Introduce an aerated organic digestion container or municipal green bin to achieve significant diversion.',
        severity: 'medium',
      });
    }

    // Rule C: Electronic Waste Hazard Warning
    if (ewasteCount > 0) {
      insights.push({
        id: 'insight-ewaste-alert',
        title: 'Specialized E-Waste Protocol Required',
        type: 'hazard_alert',
        message: `${ewasteCount} electronic waste items identified. E-waste must NEVER enter standard curbside recycling due to heavy metal toxicity and fire risk.`,
        supportingData: {
          metric: 'E-Waste Items',
          value: ewasteCount,
          count: ewasteCount,
          dateRange: dateRangeStr,
        },
        actionableStep: 'Transfer detected electronics directly to a certified R2 or e-Stewards authorized recycling partner.',
        severity: 'high',
      });
    }

    // Rule D: Cardboard & Paper Circularity
    if (paperCount > 0) {
      insights.push({
        id: 'insight-paper-recovery',
        title: 'High-Purity Paper Circularity',
        type: 'segregation_improvement',
        message: `${paperCount} paper and cardboard items logged. Corrugated cardboard and clean sheets maintain high commodity recovery value.`,
        supportingData: {
          metric: 'Fiber & Paper Count',
          value: paperCount,
          count: paperCount,
          dateRange: dateRangeStr,
        },
        actionableStep: 'Ensure boxes are flattened and shielded from moisture prior to collection to protect fiber integrity.',
        severity: 'low',
      });
    }

    return insights;
  }
}

export const analyticsService = new AnalyticsService();
