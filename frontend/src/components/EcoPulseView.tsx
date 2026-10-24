'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  TrendingUp,
  BarChart3,
  Calendar,
  Layers,
  Sparkles,
  AlertTriangle,
  Lightbulb,
  Info,
  RefreshCw,
  Clock,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { api } from '../services/api';
import { CATEGORY_COLORS } from '../../../shared/constants/categories';

export default function EcoPulseView() {
  const [summary, setSummary] = useState<any | null>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [forecastData, setForecastData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(14);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sumRes, trendRes, foreRes] = await Promise.all([
        api.getEcoPulseSummary(),
        api.getEcoPulseTrends(days),
        api.getEcoPulseForecasts(),
      ]);
      setSummary(sumRes);
      setTrends(trendRes.timeline || []);
      setForecastData(foreRes);
    } catch (err) {
      console.error('Failed to load EcoPulse analytics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [days]);

  // Format category distribution for BarChart
  const categoryBarData = summary?.categoryDistribution
    ? Object.entries(summary.categoryDistribution).map(([category, count]) => ({
        category,
        count,
        fill: CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || '#10b981',
      }))
    : [];

  // Combine observed and forecast points for projection chart
  const combinedForecastChartData: any[] = [];
  if (forecastData?.observedHistory) {
    forecastData.observedHistory.slice(-7).forEach((item: any) => {
      combinedForecastChartData.push({
        date: item.date.slice(5),
        observed: item.count,
        projected: null,
        lowerBound: null,
        upperBound: null,
      });
    });
  }
  if (forecastData?.forecast) {
    forecastData.forecast.forEach((item: any) => {
      combinedForecastChartData.push({
        date: item.date.slice(5) + ' (F)',
        observed: null,
        projected: item.projectedDetections,
        lowerBound: item.lowerBound,
        upperBound: item.upperBound,
      });
    });
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950/50 via-slate-900 to-slate-900 p-8 border border-blue-500/20 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" /> Innovation Module 04
              </span>
              <span className="text-xs text-slate-400">Waste Pattern Analytics & Predictive Intelligence</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              EcoPulse™ Intelligence Dashboard
            </h1>
            <p className="text-slate-300 max-w-2xl text-sm leading-relaxed">
              Synthesizes real-time and historical detection events into longitudinal trends, recurrence patterns, and baseline statistical projections with uncertainty bounds.
            </p>
          </div>
          <button
            onClick={fetchData}
            className="self-start md:self-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Analytics
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400 font-medium">Total Detections</div>
          <div className="text-3xl font-bold text-white font-mono">
            {summary?.totalDetections ?? 0}
          </div>
          <div className="text-[11px] text-emerald-400">
            Across {summary?.totalSessions ?? 0} sessions
          </div>
        </div>

        <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400 font-medium">Dominant Stream</div>
          <div className="text-3xl font-bold text-emerald-400 capitalize truncate">
            {summary?.topCategory ?? 'None'}
          </div>
          <div className="text-[11px] text-slate-400">Highest volume category</div>
        </div>

        <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400 font-medium">Avg Segregation Readiness</div>
          <div className="text-3xl font-bold text-cyan-400 font-mono">
            {summary?.averageSegregationReadiness ?? 90}%
          </div>
          <div className="text-[11px] text-slate-400">Confidence + Cleanliness</div>
        </div>

        <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400 font-medium">Model Disagreement</div>
          <div className="text-3xl font-bold text-amber-400 font-mono">
            {summary?.disagreementRatePercent ?? 0}%
          </div>
          <div className="text-[11px] text-slate-400">Flagged for human audit</div>
        </div>
      </div>

      {/* Historical Trend AreaChart */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" /> Longitudinal Category Volumes
            </h3>
            <p className="text-xs text-slate-400">Daily detection frequency segmented by material category</p>
          </div>
          <div className="flex items-center gap-2">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  days === d
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                Last {d} Days
              </button>
            ))}
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPlastics" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPaper" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorOrganic" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                }}
              />
              <Area type="monotone" dataKey="Plastics" stroke="#3b82f6" fillOpacity={1} fill="url(#colorPlastics)" />
              <Area type="monotone" dataKey="Paper" stroke="#f59e0b" fillOpacity={1} fill="url(#colorPaper)" />
              <Area type="monotone" dataKey="Organic" stroke="#10b981" fillOpacity={1} fill="url(#colorOrganic)" />
              <Area type="monotone" dataKey="Metal" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.2} />
              <Area type="monotone" dataKey="Glass" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid: Category Breakdown + Predictive Forecasting */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Stream Breakdown (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" /> Material Stream Breakdown
          </h3>
          <p className="text-xs text-slate-400">Total detected volume distribution across streams</p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryBarData} layout="vertical" margin={{ left: 20, right: 20, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis dataKey="category" type="category" stroke="#64748b" tick={{ fontSize: 11 }} width={70} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Predictive Forecasting (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" /> 7-Day Predictive Waste Forecasting
            </h3>
            <span className="text-[11px] text-blue-400 font-mono bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
              95% Confidence Bounds
            </span>
          </div>

          {!forecastData?.hasSufficientData ? (
            <div className="py-16 text-center space-y-2 bg-slate-950/60 rounded-xl border border-slate-800 p-6">
              <Clock className="w-8 h-8 text-slate-500 mx-auto" />
              <h4 className="text-sm font-medium text-slate-300">Insufficient Historical Data for Forecast</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {forecastData?.message || 'Forecasting requires at least 5 distinct observation days to build statistical trend models.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Baseline linear regression model projecting upcoming daily volume with upper/lower uncertainty margins.
              </p>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={combinedForecastChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '0.75rem',
                        fontSize: '11px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Line type="monotone" dataKey="observed" stroke="#10b981" strokeWidth={2} name="Observed Detections" dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="projected" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" name="Projected Volume" dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="upperBound" stroke="#64748b" strokeWidth={1} strokeDasharray="2 2" name="Upper 95% Bound" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] text-slate-500 italic">
                {forecastData.notice}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Evidence-Backed Targeted Recommendations */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-4 shadow-xl">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-400" /> Evidence-Backed Operational Insights
        </h3>
        <p className="text-xs text-slate-400">
          Automated recommendations generated from observed category recurrence and model agreement metrics.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(summary?.insights || []).map((insight: string, idx: number) => (
            <div key={idx} className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-xl text-xs text-slate-300 flex items-start gap-3">
              <span className="p-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 flex-shrink-0 mt-0.5">
                <Lightbulb className="w-3.5 h-3.5" />
              </span>
              <span className="leading-relaxed">{insight}</span>
            </div>
          ))}
        </div>

        <div className="pt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          {summary?.disclaimer || 'Metrics reflect detection events and do not measure certified municipal recycling rates.'}
        </div>
      </div>
    </div>
  );
}
