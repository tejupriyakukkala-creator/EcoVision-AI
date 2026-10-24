'use client';

import React from 'react';
import { Scan, BarChart3, ShieldCheck, ArrowRight, Sparkles, CheckCircle, Recycle, Zap, Layers } from 'lucide-react';
import { HybridPipelineDiagram } from './HybridPipelineDiagram';

interface LandingHeroProps {
  onStartDetection: () => void;
  onOpenDashboard: () => void;
  onOpenGuide: () => void;
}

export function LandingHero({ onStartDetection, onOpenDashboard, onOpenGuide }: LandingHeroProps) {
  const features = [
    {
      icon: Scan,
      title: 'Real-Time Spatial Detection',
      desc: 'Detects concurrent waste items across complex backgrounds with precise spatial bounding box coordinates.',
    },
    {
      icon: Layers,
      title: 'Fine-Grained Material Classifier',
      desc: 'Crops localized objects and applies deep texture analysis to distinguish difficult material subtypes.',
    },
    {
      icon: Zap,
      title: 'Automated Decision Fusion',
      desc: 'Reconciles model agreements, refines generic labels, and flags low-confidence items for human inspection.',
    },
    {
      icon: Recycle,
      title: 'Actionable Segregation Guidance',
      desc: 'Instantly provides preparation checklists, recycling eligibility, and municipal contamination warnings.',
    },
  ];

  return (
    <div className="space-y-20 pb-16">
      {/* Hero Header */}
      <section className="relative pt-8 sm:pt-14 pb-6 overflow-hidden text-center max-w-4xl mx-auto px-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-eco-500/10 border border-eco-500/30 text-eco-400 text-xs font-semibold mb-6 shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Next-Generation Circular Economy AI</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.15]">
          Intelligent Waste Detection &{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
            Smart Segregation
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Powered by a dual-stage <strong className="text-white font-semibold">spatial object detector</strong> and fine-grained{' '}
          <strong className="text-white font-semibold">material classifier</strong>. Identify recyclable plastics, metals, paper, glass,
          and organic waste with automated segregation recommendations.
        </p>

        {/* Call to Actions */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={onStartDetection}
            className="px-6 py-3.5 rounded-2xl bg-eco-500 hover:bg-eco-600 text-charcoal-950 font-bold text-sm flex items-center gap-2 shadow-xl shadow-eco-500/25 transition-all hover:scale-105"
          >
            <Scan className="w-4 h-4 stroke-[2.5]" />
            <span>Launch Detection Studio</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenDashboard}
            className="px-6 py-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-white font-semibold text-sm flex items-center gap-2 border border-slate-700/80 transition-all hover:scale-105"
          >
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <span>View Waste Intelligence</span>
          </button>
        </div>

        {/* Verification Badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-400" /> Real-time Webcam & Video Stream
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-400" /> Disagreement Audit & Low-Confidence Filter
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-400" /> Arduino Smart Sorter Support
          </span>
        </div>
      </section>

      {/* Dual-Stage Vision Workflow Diagram */}
      <section className="max-w-6xl mx-auto px-4">
        <HybridPipelineDiagram />
      </section>

      {/* Feature Grid Overview */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="text-center max-w-xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Full-Stack Environmental AI Architecture</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Engineered specifically to avoid misclassifications and eliminate single-model failure points.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="glass-panel rounded-2xl p-6 border border-slate-800/80 hover:border-slate-700 transition-all hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/60 text-eco-400 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-white mb-2">{feat.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Quick Showcase Banner */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="glass-panel-glow rounded-3xl p-8 sm:p-12 relative overflow-hidden bg-gradient-to-r from-charcoal-900 via-slate-900 to-charcoal-900 border border-emerald-500/20">
          <div className="max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Ready to test waste image recognition?</h2>
            <p className="text-sm text-slate-300 mt-3 leading-relaxed">
              Upload photos of plastics, paper, aluminum cans, or food scraps. Inspect spatial bounding boxes, material probability distributions, and instant municipal disposal instructions.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={onStartDetection}
                className="px-5 py-2.5 rounded-xl bg-eco-500 hover:bg-eco-600 text-charcoal-950 font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-eco-500/20"
              >
                Open Detection Studio
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={onOpenGuide}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all"
              >
                Explore Recycling Guidelines
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
