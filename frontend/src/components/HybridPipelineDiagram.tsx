'use client';

import React, { useState } from 'react';
import { Camera, BoxSelect, Crop, Cpu, Merge, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

export function HybridPipelineDiagram() {
  const [activeStage, setActiveStage] = useState(3);

  const stages = [
    {
      id: 1,
      title: 'Stage 1: Acquisition',
      subtitle: 'Input Preprocessing',
      icon: Camera,
      color: 'from-blue-500 to-cyan-500',
      description: 'Accepts high-res camera uploads, video streams, or webcam frames. Resizes, normalizes, and prepares tensor inputs.',
    },
    {
      id: 2,
      title: 'Stage 2: Spatial Localization',
      subtitle: 'Real-Time Object Detection',
      icon: BoxSelect,
      color: 'from-emerald-500 to-teal-500',
      description: 'Spatial detector predicts bounding boxes [x1, y1, x2, y2], item counts, and localized candidate categories with confidence metrics.',
    },
    {
      id: 3,
      title: 'Stage 3: Fine-Grained Classifier',
      subtitle: 'Material Characteristic Analysis',
      icon: Crop,
      color: 'from-purple-500 to-indigo-500',
      description: 'Crops each detected object region from the raw image and executes deep feature extraction to determine material subtype (PET vs soft plastic, glass vs metal).',
    },
    {
      id: 4,
      title: 'Stage 4: Prediction Fusion',
      subtitle: 'Decision Engine & Disagreement Audit',
      icon: Merge,
      color: 'from-amber-500 to-orange-500',
      description: 'Combines spatial geometry with surface texture analysis. Validates confidence thresholds, resolves conflicts, and flags ambiguous detections for human review.',
    },
    {
      id: 5,
      title: 'Stage 5: Segregation Action',
      subtitle: 'Category Mapping & Disposal Guidance',
      icon: Sparkles,
      color: 'from-eco-500 to-emerald-400',
      description: 'Maps fused material into 8 standard waste streams, generates actionable recycling instructions, and signals the Arduino servo sorting gate.',
    },
  ];

  return (
    <div className="w-full glass-panel rounded-3xl p-6 sm:p-10 border border-slate-800">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-eco-500/10 text-eco-400 border border-eco-500/30 uppercase tracking-wider">
          Dual-Stage Deep Learning Pipeline
        </span>
        <h3 className="text-2xl sm:text-3xl font-extrabold text-white mt-3">
          Dual-Stage Vision Architectural Flow
        </h3>
        <p className="text-sm text-slate-400 mt-2">
          Discover how spatial bounding box localization and fine-grained material classification operate synergistically.
        </p>
      </div>

      {/* Interactive Stage Pipeline Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
        {stages.map((stage) => {
          const Icon = stage.icon;
          const isSelected = activeStage === stage.id;
          return (
            <div
              key={stage.id}
              onClick={() => setActiveStage(stage.id)}
              className={`cursor-pointer rounded-2xl p-4 transition-all flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-800/90 border-2 border-eco-500 shadow-lg shadow-eco-500/10 scale-[1.02]'
                  : 'bg-slate-800/40 border border-slate-700/60 hover:bg-slate-800/70 hover:border-slate-600'
              }`}
            >
              <div>
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${stage.color} flex items-center justify-center text-white mb-3 shadow-md`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">{stage.title}</h4>
                <p className="text-[11px] text-eco-400 font-medium mt-0.5">{stage.subtitle}</p>
              </div>

              <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400">
                <span>Step {stage.id} of 5</span>
                <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-eco-400 animate-pulse' : 'bg-slate-600'}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Stage Detail Drawer */}
      <div className="mt-8 p-6 rounded-2xl bg-charcoal-950/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-eco-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <CheckCircle2 className="w-4 h-4" />
            Active Stage Focus: {stages[activeStage - 1].subtitle}
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            {stages[activeStage - 1].description}
          </p>
        </div>

        <button
          onClick={() => setActiveStage((prev) => (prev % 5) + 1)}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700 shrink-0 transition-colors"
        >
          <span>Next Step</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
