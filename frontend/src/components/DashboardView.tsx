'use client';

import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Recycle,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Sparkles,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const CATEGORY_COLORS: Record<string, string> = {
  Plastic: '#f59e0b',
  'Paper and cardboard': '#3b82f6',
  Metal: '#06b6d4',
  Glass: '#10b981',
  'Organic waste': '#84cc16',
  'Electronic waste': '#a855f7',
  'Other or mixed waste': '#64748b',
  'Unknown or needs review': '#f43f5e',
};

export function DashboardView() {
  const { token, user } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [userOnly, setUserOnly] = useState<boolean>(false);
  const [trendDays, setTrendDays] = useState<number>(14);

  useEffect(() => {
    fetchDashboardData();
  }, [userOnly, trendDays]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [sumRes, trendRes, insightRes] = await Promise.all([
        api.getAnalyticsSummary({ userOnly }, token),
        api.getAnalyticsTrends(trendDays),
        api.getWasteInsights(),
      ]);

      setSummary(sumRes);
      setTrends(trendRes);
      setInsights(insightRes);
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics records from MongoDB.');
      setIsLoading(false);
    }
  };

  const pieData =
    summary?.categoryDistribution?.map((c: any) => ({
      name: c.category,
      value: c.count,
      percentage: c.percentage,
    })) || [];

  const confidenceData = [
    { tier: 'High Confidence (≥75%)', count: summary?.confidenceDistribution?.high || 0, fill: '#10b981' },
    { tier: 'Moderate (50-74%)', count: summary?.confidenceDistribution?.moderate || 0, fill: '#f59e0b' },
    { tier: 'Low / Review (<50%)', count: summary?.confidenceDistribution?.low || 0, fill: '#f43f5e' },
  ];

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-10 h-10 border-4 border-eco-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400">Aggregating real-time waste analytics from MongoDB...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      {/* Dashboard Header & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-eco-500/10 text-eco-400 border border-eco-500/30 uppercase tracking-wider">
            Waste Intelligence
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">Live Waste Analytics & Circularity Metrics</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Aggregated from verified MongoDB records. Inspect material distribution, detection confidence, and data-driven segregation insights.
          </p>
        </div>

        {/* User Scope & Refresh Filter */}
        <div className="flex items-center gap-3">
          {user && (
            <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={userOnly}
                onChange={(e) => setUserOnly(e.target.checked)}
                className="accent-eco-500 rounded"
              />
              <span>My Detections Only</span>
            </label>
          )}

          <select
            value={trendDays}
            onChange={(e) => setTrendDays(parseInt(e.target.value))}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-eco-500"
          >
            <option value={7}>Past 7 Days</option>
            <option value={14}>Past 14 Days</option>
            <option value={30}>Past 30 Days</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel rounded-2xl p-5 border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Sessions</span>
          <div className="text-3xl font-extrabold text-white mt-2">{summary?.totalSessions || 0}</div>
          <p className="text-[11px] text-slate-500 mt-1">Logged detection sessions</p>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Items Detected</span>
          <div className="text-3xl font-extrabold text-white mt-2">{summary?.totalItems || 0}</div>
          <p className="text-[11px] text-eco-400 mt-1">Multi-object localized</p>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Recyclability Rate</span>
          <div className="text-3xl font-extrabold text-emerald-400 mt-2">{summary?.recyclabilityRate || 0}%</div>
          <p className="text-[11px] text-slate-500 mt-1">
            {summary?.recyclableItems || 0} eligible recyclable items
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Dominant Category</span>
          <div className="text-xl font-extrabold text-amber-400 mt-2 truncate">
            {summary?.topCategory || 'Awaiting Data'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Most frequent stream</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category Breakdown Pie Chart */}
        <div className="lg:col-span-5 glass-panel rounded-3xl p-6 border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center justify-between">
              <span>Waste Material Stream Share</span>
              <span className="text-xs text-slate-400 font-normal">By item count</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Distribution across the 8 standard waste classifications</p>
          </div>

          <div className="h-64 my-4">
            {pieData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No items detected yet. Use Detection Studio to generate records.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry: any) => (
                      <Cell
                        key={`cell-${entry.name}`}
                        fill={CATEGORY_COLORS[entry.name] || '#64748b'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                    itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Pie Legend List */}
          <div className="grid grid-cols-2 gap-2 text-[11px] pt-3 border-t border-slate-800">
            {pieData.slice(0, 6).map((item: any) => (
              <div key={item.name} className="flex items-center gap-1.5 truncate">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: CATEGORY_COLORS[item.name] || '#64748b' }}
                />
                <span className="text-slate-300 truncate">{item.name}</span>
                <span className="text-slate-500 ml-auto font-mono">({item.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Detection Trends Area Chart */}
        <div className="lg:col-span-7 glass-panel rounded-3xl p-6 border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center justify-between">
              <span>Detection Activity Trends</span>
              <span className="text-xs text-eco-400 font-semibold">{trendDays} Day Window</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Daily volume of detection sessions vs total recognized items</p>
          </div>

          <div className="h-72 my-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends}>
                <defs>
                  <linearGradient id="itemsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="sessionsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickFormatter={(d) => d.slice(5)} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="items" name="Items Recognized" stroke="#10b981" fill="url(#itemsGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="detections" name="Sessions Run" stroke="#3b82f6" fill="url(#sessionsGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Model Confidence Distribution */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800">
        <h3 className="text-sm font-bold text-white mb-1">Inference Confidence Quality Distribution</h3>
        <p className="text-xs text-slate-400 mb-4">
          Objects categorized by fused confidence rating. Confident classifications automate segregation; lower tiers trigger audit flags.
        </p>

        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={confidenceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="tier" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={10} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
              />
              <Bar dataKey="count" name="Identified Objects" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Waste Intelligence Module (Transparent Rule-Driven Insights) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-eco-400" />
              Waste Intelligence Insights & Recommended Initiatives
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Transparent, data-backed initiatives derived directly from your persistent MongoDB waste composition records.
            </p>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {insights.length} Actionable Recommendations
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className="glass-panel rounded-2xl p-5 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
                    {insight.title}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      insight.severity === 'high'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        : insight.severity === 'medium'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {insight.severity} Priority
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed mb-3">{insight.message}</p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Supporting Evidence:</span>
                  <span className="text-slate-200 font-mono font-semibold">
                    {insight.supportingData.metric}: {insight.supportingData.value} ({insight.supportingData.count} items in {insight.supportingData.dateRange})
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-charcoal-950/80 border border-slate-800 text-xs text-eco-300 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-eco-400 shrink-0 mt-0.5" />
                  <span>{insight.actionableStep}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
