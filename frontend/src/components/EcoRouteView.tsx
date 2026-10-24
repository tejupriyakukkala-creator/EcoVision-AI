'use client';

import React, { useState, useEffect } from 'react';
import {
  Compass,
  Trash2,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Search,
  BookOpen,
  ArrowRight,
  Sparkles,
  Info,
} from 'lucide-react';
import { api } from '../services/api';
import { WASTE_CATEGORIES, CATEGORY_COLORS } from '../../../shared/constants/categories';

interface EcoRouteViewProps {
  onOpenArduinoSimulator?: () => void;
}

const BIN_CONFIGURATIONS = [
  { id: '2-stream', name: '2-Stream', desc: 'Mixed Recyclables + General Landfill' },
  { id: '3-stream', name: '3-Stream', desc: 'Recyclables + Organic Compost + Landfill' },
  { id: '4-stream', name: '4-Stream', desc: 'Containers + Clean Paper + Organics + Landfill' },
  { id: '6-stream', name: '6-Stream Dedicated MRF', desc: 'Plastics, Paper, Metal, Glass, Organics, E-Waste' },
];

export default function EcoRouteView({ onOpenArduinoSimulator }: EcoRouteViewProps) {
  const [selectedCategory, setSelectedCategory] = useState('Plastics');
  const [selectedSubtype, setSelectedSubtype] = useState('plastic bottle');
  const [hasContamination, setHasContamination] = useState(false);
  const [binConfig, setBinConfig] = useState('4-stream');
  const [locality, setLocality] = useState('Municipal Circular Standard');
  const [recommendation, setRecommendation] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [rules, setRules] = useState<any[]>([]);
  const [ruleSearch, setRuleSearch] = useState('');

  const fetchRecommendation = async () => {
    try {
      setLoading(true);
      const res = await api.getEcoRouteRecommendation({
        wasteCategory: selectedCategory,
        subtype: selectedSubtype,
        hasVisibleResidue: hasContamination,
        binConfig,
        locality,
      });
      setRecommendation(res);
    } catch (err) {
      console.error('Failed to get recommendation', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRules = async () => {
    try {
      const data = await api.getDisposalRules();
      setRules(data || []);
    } catch (err) {
      console.error('Failed to load rules', err);
    }
  };

  useEffect(() => {
    fetchRecommendation();
  }, [selectedCategory, selectedSubtype, hasContamination, binConfig, locality]);

  useEffect(() => {
    fetchRules();
  }, []);

  const filteredRules = rules.filter((r) => {
    if (!ruleSearch) return true;
    const s = ruleSearch.toLowerCase();
    return (
      r.wasteCategory?.toLowerCase().includes(s) ||
      r.itemSubtype?.toLowerCase().includes(s) ||
      r.disposalMethod?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-950/40 via-slate-900 to-slate-900 p-8 border border-teal-500/20 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5" /> Innovation Module 03
              </span>
              <span className="text-xs text-slate-400">Context-Aware Disposal & Routing Engine</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              EcoRoute™ Intelligent Disposal Router
            </h1>
            <p className="text-slate-300 max-w-2xl text-sm leading-relaxed">
              Dynamically maps recognized materials to real-world collection streams based on your local bin infrastructure (2-stream, 4-stream, or 6-stream MRF) and contamination state, with optional Arduino hardware servo gate dispatching.
            </p>
          </div>

          {onOpenArduinoSimulator && (
            <button
              onClick={onOpenArduinoSimulator}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-950/40 flex items-center gap-2 transition-all"
            >
              <Cpu className="w-4 h-4" /> Open Arduino Servo Simulator
            </button>
          )}
        </div>
      </div>

      {/* Interactive Router Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Configuration Panel (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-emerald-400" /> Disposal Scenario Inputs
          </h3>

          {/* Bin Stream Architecture */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300">Local Bin Stream Configuration</label>
            <div className="grid grid-cols-2 gap-2">
              {BIN_CONFIGURATIONS.map((cfg) => (
                <button
                  key={cfg.id}
                  onClick={() => setBinConfig(cfg.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    binConfig === cfg.id
                      ? 'bg-emerald-950/50 border-emerald-500 text-white shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-xs font-bold">{cfg.name}</div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">{cfg.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Waste Category Selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300">Material Category</label>
            <div className="grid grid-cols-4 gap-2">
              {WASTE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setSelectedSubtype(cat.toLowerCase());
                  }}
                  className={`py-2 px-1 text-center rounded-lg border text-xs font-medium transition-all ${
                    selectedCategory === cat
                      ? 'bg-slate-800 border-emerald-500 text-emerald-400 shadow'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Subtype Specification */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Detected Item Subtype</label>
            <input
              type="text"
              value={selectedSubtype}
              onChange={(e) => setSelectedSubtype(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Contamination Toggle */}
          <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800/80 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Visible Food/Liquid Residue
              </div>
              <p className="text-[11px] text-slate-500">Simulate grease stains, liquid puddles, or dirt</p>
            </div>
            <button
              onClick={() => setHasContamination(!hasContamination)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                hasContamination ? 'bg-amber-500' : 'bg-slate-800'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  hasContamination ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Dynamic Route Output (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Compass className="w-4 h-4 text-teal-400" /> Recommended Disposal Guidance
              </h3>
              <span className="text-xs text-slate-500 font-mono">{locality}</span>
            </div>

            {loading || !recommendation ? (
              <div className="py-16 text-center text-xs text-slate-500">Calculating routing rules...</div>
            ) : (
              <div className="space-y-5">
                {/* Target Bin Spotlight */}
                <div
                  className="p-5 rounded-2xl border flex items-center justify-between gap-4"
                  style={{
                    backgroundColor: `${recommendation.binColor}15`,
                    borderColor: `${recommendation.binColor}40`,
                  }}
                >
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: recommendation.binColor }}>
                      Target Collection Destination
                    </span>
                    <h2 className="text-2xl font-extrabold text-white">{recommendation.targetBin}</h2>
                    <p className="text-xs text-slate-300">
                      Recycling Eligibility:{' '}
                      <span className={recommendation.recyclingEligibility ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                        {recommendation.recyclingEligibility ? 'Accepted for Recycling' : 'Non-Recyclable / Organics Stream'}
                      </span>
                    </p>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Arduino Servo Gate</div>
                    <div className="text-2xl font-mono font-bold text-white">
                      {recommendation.servoGateAngle}°
                    </div>
                  </div>
                </div>

                {/* Preparation Instructions */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Mandatory Preparation Checklist
                  </h4>
                  <ul className="space-y-1.5">
                    {(recommendation.preparationInstructions || []).map((step: string, idx: number) => (
                      <li key={idx} className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Rule Provenance Note */}
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div className="text-slate-300 font-semibold flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-teal-400" /> Rule Provenance:
                  </div>
                  <div>{recommendation.ruleSource}</div>
                  <div className="text-[10px] text-slate-500 italic">{recommendation.disclaimer}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Official Circular Rules Directory */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-400" /> Comprehensive Material Recycling Directory
            </h3>
            <p className="text-xs text-slate-400">Standardized preparation and circular sorting rules across all recognized streams</p>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search material rules..."
              value={ruleSearch}
              onChange={(e) => setRuleSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRules.map((r, idx) => (
            <div key={idx} className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 space-y-3 hover:border-slate-700 transition-colors">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-white capitalize">{r.itemSubtype}</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {r.wasteCategory}
                </span>
              </div>
              <div className="text-xs text-emerald-400 font-medium">{r.disposalMethod}</div>
              <p className="text-xs text-slate-400 leading-relaxed">{r.reason}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
