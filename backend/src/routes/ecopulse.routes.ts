import { Router, Request, Response } from 'express';
import { WasteRecord } from '../models/WasteRecord.js';
import { DetectionSession } from '../models/DetectionSession.js';
import { UserAction } from '../models/UserAction.js';

export const ecopulseRouter = Router();

// GET /api/ecopulse/summary - Overall analytics summary
ecopulseRouter.get('/summary', async (req: Request, res: Response): Promise<void> => {
  try {
    const totalSessions = await DetectionSession.countDocuments();
    const totalRecords = await WasteRecord.countDocuments();
    const confirmedActions = await UserAction.countDocuments({ confirmationStatus: 'confirmed' });
    const pendingReviews = await WasteRecord.countDocuments({ reviewStatus: 'needs_review' });

    // Category distribution
    const categoryAgg = await WasteRecord.aggregate([
      { $group: { _id: '$wasteCategory', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const categoryDistribution: Record<string, number> = {};
    categoryAgg.forEach((item) => {
      if (item._id) categoryDistribution[item._id] = item.count;
    });

    const topCategory = categoryAgg.length > 0 ? categoryAgg[0]._id : 'None';

    // Average confidence & readiness
    const metricsAgg = await WasteRecord.aggregate([
      {
        $group: {
          _id: null,
          avgConfidence: { $avg: '$confidenceScore' },
          avgReadiness: { $avg: '$segregationReadiness.score' },
        },
      },
    ]);

    const avgConfidence = metricsAgg.length > 0 ? Math.round(metricsAgg[0].avgConfidence * 100) : 0;
    const avgReadiness = metricsAgg.length > 0 ? Math.round(metricsAgg[0].avgReadiness * 10) / 10 : 0;

    // Disagreement rate
    const disputedCount = await WasteRecord.countDocuments({
      modelAgreement: { $in: ['disputed', 'low_confidence'] },
    });
    const disagreementRate = totalRecords > 0 ? Math.round((disputedCount / totalRecords) * 100) : 0;

    // Targeted evidence-backed recommendations
    const evidenceInsights: string[] = [];
    if ((categoryDistribution['Plastics'] || 0) > 10) {
      evidenceInsights.push('Persistent high plastic volume observed: suggest launching a targeted campus/facility reusable bottle initiative.');
    }
    if ((categoryDistribution['Organic'] || 0) > 5) {
      evidenceInsights.push('Rising organic waste proportion: consider deploying on-site aerobic composting bins to divert organic matter from landfills.');
    }
    if (disagreementRate > 15) {
      evidenceInsights.push(`Elevated model disagreement rate (${disagreementRate}%): review flagged instances in EcoGuard to expand CNN training crop variety.`);
    }
    if (evidenceInsights.length === 0) {
      evidenceInsights.push('Waste stream distribution is balanced. Continue daily monitoring to establish baseline operational trends.');
    }

    res.json({
      totalSessions,
      totalDetections: totalRecords,
      confirmedActions,
      pendingReviews,
      topCategory,
      categoryDistribution,
      averageConfidencePercent: avgConfidence,
      averageSegregationReadiness: avgReadiness,
      disagreementRatePercent: disagreementRate,
      insights: evidenceInsights,
      disclaimer: 'Metrics reflect AI detection counts and do not measure certified municipal recycling rates or carbon offsets.',
    });
  } catch (err: any) {
    console.error('[EcoPulse Summary Error]', err);
    res.status(500).json({ error: 'Failed to retrieve EcoPulse summary' });
  }
});

// GET /api/ecopulse/trends - Daily detection volume by category over the last N days
ecopulseRouter.get('/trends', async (req: Request, res: Response): Promise<void> => {
  try {
    const days = parseInt(req.query.days as string) || 14;
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const trendAgg = await WasteRecord.aggregate([
      { $match: { createdAt: { $gte: sinceDate } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            category: '$wasteCategory',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]);

    // Format dates map
    const datesMap: Record<string, Record<string, number>> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const dateStr = d.toISOString().split('T')[0];
      datesMap[dateStr] = {
        date: dateStr as any,
        total: 0,
        Plastics: 0,
        Paper: 0,
        Metal: 0,
        Glass: 0,
        Organic: 0,
        'E-Waste': 0,
      };
    }

    trendAgg.forEach((item) => {
      const dateStr = item._id.date;
      const cat = item._id.category;
      if (datesMap[dateStr]) {
        datesMap[dateStr][cat] = (datesMap[dateStr][cat] || 0) + item.count;
        datesMap[dateStr].total = (datesMap[dateStr].total || 0) + item.count;
      }
    });

    res.json({
      days,
      timeline: Object.values(datesMap),
    });
  } catch (err: any) {
    console.error('[EcoPulse Trends Error]', err);
    res.status(500).json({ error: 'Failed to retrieve trends' });
  }
});

// GET /api/ecopulse/forecasts - Baseline linear trend forecasting with prediction intervals
ecopulseRouter.get('/forecasts', async (req: Request, res: Response): Promise<void> => {
  try {
    // Group daily counts for the last 30 days
    const dailyAgg = await WasteRecord.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Check if sufficient distinct days exist
    if (dailyAgg.length < 5) {
      res.json({
        hasSufficientData: false,
        message: 'Insufficient historical data for forecasting (minimum 5 distinct observation days required)',
        observedDays: dailyAgg.length,
        forecast: [],
      });
      return;
    }

    // Baseline Simple Linear Regression on daily counts
    const n = dailyAgg.length;
    const xValues = dailyAgg.map((_, idx) => idx);
    const yValues = dailyAgg.map((item) => item.count);

    const xMean = xValues.reduce((a, b) => a + b, 0) / n;
    const yMean = yValues.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (xValues[i] - xMean) * (yValues[i] - yMean);
      denominator += (xValues[i] - xMean) ** 2;
    }

    const slope = denominator !== 0 ? numerator / denominator : 0;
    const intercept = yMean - slope * xMean;

    // Estimate residual standard deviation for prediction intervals
    let sumSquaredResiduals = 0;
    for (let i = 0; i < n; i++) {
      const pred = intercept + slope * xValues[i];
      sumSquaredResiduals += (yValues[i] - pred) ** 2;
    }
    const stdDev = Math.sqrt(sumSquaredResiduals / Math.max(1, n - 2));

    // Forecast next 7 days
    const lastDate = new Date(dailyAgg[dailyAgg.length - 1]._id);
    const forecastDays = 7;
    const forecast = [];

    for (let step = 1; step <= forecastDays; step++) {
      const futureDate = new Date(lastDate);
      futureDate.setDate(futureDate.getDate() + step);
      const dateStr = futureDate.toISOString().split('T')[0];

      const x = n - 1 + step;
      const pointEstimate = Math.max(0, Math.round(intercept + slope * x));
      const margin = Math.round(1.96 * stdDev); // ~95% confidence bounds

      forecast.push({
        date: dateStr,
        projectedDetections: pointEstimate,
        lowerBound: Math.max(0, pointEstimate - margin),
        upperBound: pointEstimate + margin,
        confidenceLevel: 0.95,
      });
    }

    res.json({
      hasSufficientData: true,
      modelType: 'Linear Trend Baseline with 95% Confidence Bounds',
      observedHistory: dailyAgg.map((item) => ({ date: item._id, count: item.count })),
      forecast,
      notice: 'Forecast represents mathematical trend projection of detected items, subject to behavioral and operational variations.',
    });
  } catch (err: any) {
    console.error('[EcoPulse Forecast Error]', err);
    res.status(500).json({ error: 'Failed to compute predictive forecast' });
  }
});
