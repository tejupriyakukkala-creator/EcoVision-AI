'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, Search, CheckCircle, AlertTriangle, ExternalLink, RefreshCw, ShieldAlert, Check } from 'lucide-react';
import { api } from '../services/api';
import { WASTE_CATEGORIES, COLOR_PALETTE_BY_CATEGORY, WasteCategory } from '@shared/constants/categories';

export function RecyclingGuideView() {
  const [rules, setRules] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [search, setSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchRules();
  }, [selectedCategory, search]);

  const fetchRules = async () => {
    setIsLoading(true);
    try {
      const data = await api.getDisposalRules(selectedCategory, search);
      setRules(data);
      setIsLoading(false);
    } catch {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6">
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-eco-500/10 text-eco-400 border border-eco-500/30 uppercase tracking-wider">
          Standardized Knowledgebase
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">Smart Waste Segregation & Recycling Guide</h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Learn the preparation standards, contamination risks, and optimal recycling destinations for all recognized material subtypes.
        </p>
      </div>

      {/* Search & Category Filter Pills */}
      <div className="space-y-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search material guidelines (e.g. bottle, can, cardboard)..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-eco-500"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              selectedCategory === 'All'
                ? 'bg-eco-500 text-charcoal-950 shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700'
            }`}
          >
            All Categories
          </button>
          {WASTE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedCategory === cat
                  ? 'bg-eco-500 text-charcoal-950 shadow-md'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Rules Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading segregation guidelines...</div>
      ) : rules.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center text-xs text-slate-400 border border-slate-800">
          No recycling guidelines matched your search criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rules.map((rule) => {
            const cat = rule.wasteCategory as WasteCategory;
            const color = COLOR_PALETTE_BY_CATEGORY[cat] || COLOR_PALETTE_BY_CATEGORY['Other or mixed waste'];

            return (
              <div
                key={rule._id}
                className="glass-panel rounded-3xl p-6 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${color.bg} ${color.text} border ${color.border}`}>
                      {rule.wasteCategory}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      rule.recyclingEligibility
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    }`}>
                      {rule.recyclingEligibility ? 'Recyclable' : 'Special Collection'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white capitalize mt-1">{rule.itemSubtype}</h3>
                  <div className="text-xs text-slate-300 font-medium mt-1">
                    Destination: <span className="text-eco-400">{rule.disposalMethod}</span>
                  </div>

                  {/* Checklist */}
                  <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Preparation Instructions
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {rule.preparationInstructions.map((instr: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-eco-400 shrink-0 mt-0.5" />
                          <span>{instr}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/60">
                  <p className="text-[11px] text-slate-400 italic">
                    Circularity rationale: {rule.reason}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-2">
                    Region applicability: {rule.applicableRegion}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
