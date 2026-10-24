'use client';

import React from 'react';
import {
  Leaf,
  Scan,
  Fingerprint,
  ShieldAlert,
  Compass,
  Activity,
  Sparkles,
  BookOpen,
  Cpu,
  User as UserIcon,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenArduinoModal: () => void;
}

export function Navbar({ activeTab, setActiveTab, onOpenArduinoModal }: NavbarProps) {
  const { user, logout, openAuthModal } = useAuth();

  const navItems = [
    { id: 'landing', label: 'Overview', icon: Leaf },
    { id: 'studio', label: 'Studio', icon: Scan },
    { id: 'ecotwin', label: 'EcoTwin', icon: Fingerprint },
    { id: 'ecoguard', label: 'EcoGuard', icon: ShieldAlert },
    { id: 'ecoroute', label: 'EcoRoute', icon: Compass },
    { id: 'ecopulse', label: 'EcoPulse', icon: Activity },
    { id: 'ecoloop', label: 'EcoLoop', icon: Sparkles },
    { id: 'guide', label: 'Guide', icon: BookOpen },
    { id: 'model', label: 'Models', icon: Cpu },
  ];

  return (
    <nav className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800 bg-charcoal-900/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setActiveTab('landing')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-eco-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Leaf className="w-6 h-6 text-charcoal-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold tracking-tight text-white">EcoVision</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-eco-500/10 text-eco-400 border border-eco-500/30">
                  AI
                </span>
              </div>
              <p className="text-[10px] text-slate-400 tracking-wider uppercase font-medium">
                Intelligent Waste Segregation
              </p>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-eco-500/15 text-eco-400 border border-eco-500/30 shadow-sm shadow-eco-500/10'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-eco-400' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-3">
            {/* Arduino Hardware Simulator Trigger */}
            <button
              onClick={onOpenArduinoModal}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="Open Arduino Smart Segregation Hardware Simulator"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Arduino Sorter
            </button>

            {/* Auth Button / Profile */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
                  <div className="w-6 h-6 rounded-full bg-eco-500/20 text-eco-400 flex items-center justify-center text-xs font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium text-slate-200 hidden sm:inline">{user.name}</span>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                  title="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openAuthModal('login')}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => openAuthModal('register')}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-eco-500 hover:bg-eco-600 text-charcoal-950 transition-colors shadow-md shadow-eco-500/20"
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
