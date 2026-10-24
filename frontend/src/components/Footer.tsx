'use client';

import React from 'react';
import { Leaf, Cpu, Github, ExternalLink, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full border-t border-slate-800/80 bg-charcoal-950 py-10 px-4 sm:px-6 lg:px-8 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-eco-500/20 text-eco-400 flex items-center justify-center">
            <Leaf className="w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold text-slate-200">EcoVision AI</p>
            <p className="text-[11px] text-slate-500">
              Intelligent Multi-Modal Waste Detection & Smart Segregation Platform
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Real-Time Spatial Detection</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span>Deep Material Classification</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            <span>MongoDB Data Persistence</span>
          </div>
        </div>

        <div className="text-center md:text-right text-slate-500 text-[11px]">
          <p>© 2026 EcoVision AI Project. Built for Circular Economy Innovation.</p>
          <p className="mt-0.5 text-slate-600">Decision Fusion & Real-Time Waste Analytics Engine</p>
        </div>
      </div>
    </footer>
  );
}
