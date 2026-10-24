'use client';

import React, { useState } from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { LandingHero } from '../components/LandingHero';
import { DetectionStudio } from '../components/DetectionStudio';
import { DetectionResultsView } from '../components/DetectionResultsView';
import EcoTwinView from '../components/EcoTwinView';
import EcoGuardView from '../components/EcoGuardView';
import EcoRouteView from '../components/EcoRouteView';
import EcoPulseView from '../components/EcoPulseView';
import EcoLoopView from '../components/EcoLoopView';
import { HistoryView } from '../components/HistoryView';
import { RecyclingGuideView } from '../components/RecyclingGuideView';
import { ModelInfoView } from '../components/ModelInfoView';
import { ArduinoSimulatorModal } from '../components/ArduinoSimulatorModal';

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>('landing');
  const [detectionResults, setDetectionResults] = useState<any | null>(null);
  const [isArduinoModalOpen, setIsArduinoModalOpen] = useState<boolean>(false);

  const handleDetectionComplete = (results: any) => {
    setDetectionResults(results);
    setActiveTab('results');
  };

  return (
    <div className="min-h-screen flex flex-col bg-charcoal-950 text-slate-100">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenArduinoModal={() => setIsArduinoModalOpen(true)}
      />

      <main className="flex-1">
        {activeTab === 'landing' && (
          <LandingHero
            onStartDetection={() => setActiveTab('studio')}
            onOpenDashboard={() => setActiveTab('ecopulse')}
            onOpenGuide={() => setActiveTab('guide')}
          />
        )}

        {activeTab === 'studio' && (
          <DetectionStudio onDetectionComplete={handleDetectionComplete} />
        )}

        {activeTab === 'results' && (
          <DetectionResultsView
            results={detectionResults}
            onBackToStudio={() => setActiveTab('studio')}
          />
        )}

        {/* 5 Innovation Modules */}
        {activeTab === 'ecotwin' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <EcoTwinView />
          </div>
        )}

        {activeTab === 'ecoguard' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <EcoGuardView />
          </div>
        )}

        {activeTab === 'ecoroute' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <EcoRouteView onOpenArduinoSimulator={() => setIsArduinoModalOpen(true)} />
          </div>
        )}

        {(activeTab === 'ecopulse' || activeTab === 'dashboard') && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <EcoPulseView />
          </div>
        )}

        {activeTab === 'ecoloop' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <EcoLoopView />
          </div>
        )}

        {activeTab === 'history' && <HistoryView />}

        {activeTab === 'guide' && <RecyclingGuideView />}

        {activeTab === 'model' && <ModelInfoView />}
      </main>

      <Footer />

      {/* Arduino Hardware Simulator Modal */}
      <ArduinoSimulatorModal
        isOpen={isArduinoModalOpen}
        onClose={() => setIsArduinoModalOpen(false)}
      />
    </div>
  );
}
