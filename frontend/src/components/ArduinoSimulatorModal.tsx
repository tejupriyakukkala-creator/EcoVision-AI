'use client';

import React, { useState } from 'react';
import { X, Play, RotateCcw, AlertOctagon, CheckCircle2, ShieldAlert, Cpu } from 'lucide-react';
import { api } from '../services/api';

interface ArduinoSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ArduinoSimulatorModal({ isOpen, onClose }: ArduinoSimulatorModalProps) {
  const [currentAngle, setCurrentAngle] = useState(0);
  const [activeBin, setActiveBin] = useState('Neutral Gate');
  const [isEstop, setIsEstop] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Simulator idle and ready.');
  const [logs, setLogs] = useState<Array<{ id: string; time: string; text: string; isError?: boolean }>>([
    { id: '1', time: new Date().toLocaleTimeString(), text: 'Arduino Hardware Simulator connected via virtual serial interface (COM3 simulated).' },
  ]);

  if (!isOpen) return null;

  const bins = [
    { name: 'Neutral Inspection Gate', category: 'Neutral', angle: 0, color: 'text-slate-400 border-slate-700' },
    { name: 'Bin 1: Plastics', category: 'Plastic', angle: 30, color: 'text-amber-400 border-amber-500/30' },
    { name: 'Bin 2: Paper & Cardboard', category: 'Paper and cardboard', angle: 60, color: 'text-blue-400 border-blue-500/30' },
    { name: 'Bin 3: Metals & Cans', category: 'Metal', angle: 90, color: 'text-cyan-400 border-cyan-500/30' },
    { name: 'Bin 4: Glass Containers', category: 'Glass', angle: 120, color: 'text-emerald-400 border-emerald-500/30' },
    { name: 'Bin 5: Organics & Compost', category: 'Organic waste', angle: 150, color: 'text-lime-400 border-lime-500/30' },
    { name: 'Bin 6: Special E-Waste', category: 'Electronic waste', angle: 180, color: 'text-purple-400 border-purple-500/30' },
  ];

  const handleTrigger = async (category: string, angle: number) => {
    if (isEstop) {
      addLog('Cannot actuate: Emergency stop is active.', true);
      return;
    }
    try {
      const res = await api.triggerArduino(category, `${category.toLowerCase()} sample`, 0.92, true);
      if (res.success) {
        setCurrentAngle(res.servo_angle);
        setActiveBin(res.target_bin);
        setStatusMessage(res.message);
        addLog(`Triggered [${category}] -> Rotated servo to ${res.servo_angle}° (${res.target_bin})`);
      } else {
        setStatusMessage(res.message);
        addLog(`Actuation declined: ${res.message}`, true);
      }
    } catch (err: any) {
      addLog(`Communication error: ${err.message}`, true);
    }
  };

  const handleEstop = async () => {
    try {
      await api.estopArduino();
      setIsEstop(true);
      setCurrentAngle(0);
      setActiveBin('EMERGENCY LOCKED');
      setStatusMessage('EMERGENCY STOP ENGAGED: Hardware locked at 0°');
      addLog('!!! EMERGENCY STOP TRIGGERED: Hardware interlock locked !!!', true);
    } catch (err: any) {
      addLog(`E-Stop signal error: ${err.message}`, true);
    }
  };

  const handleReset = async () => {
    try {
      await api.resetArduino();
      setIsEstop(false);
      setStatusMessage('Emergency stop cleared. Simulator resumed.');
      addLog('Emergency stop interlock reset. Status normal.');
    } catch (err: any) {
      addLog(`Reset error: ${err.message}`, true);
    }
  };

  const addLog = (text: string, isError: boolean = false) => {
    setLogs((prev) => [
      { id: Date.now().toString(), time: new Date().toLocaleTimeString(), text, isError },
      ...prev.slice(0, 19),
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl glass-panel rounded-2xl p-6 sm:p-8 border border-slate-700 shadow-2xl bg-charcoal-900/95 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              Arduino Smart Segregation Simulator
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Active Protocol
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Hardware integration testbed controlling multi-bin sorting servo gates
            </p>
          </div>
        </div>

        {/* Visual Servo Angle Gauge */}
        <div className="p-6 rounded-2xl bg-charcoal-950/80 border border-slate-800 flex flex-col items-center justify-center mb-6">
          <div className="relative w-48 h-28 flex items-end justify-center overflow-hidden">
            {/* Gauge Semi-Circle Arc */}
            <div className="w-44 h-44 rounded-full border-8 border-slate-800 border-t-eco-500 border-r-cyan-500 border-b-transparent border-l-amber-500 absolute -bottom-16" />
            
            {/* Needle */}
            <div
              className="w-1.5 h-20 bg-rose-500 rounded-full origin-bottom transition-transform duration-500 shadow-lg shadow-rose-500/50"
              style={{
                transform: `rotate(${currentAngle - 90}deg)`,
              }}
            />
            {/* Needle Pivot Center */}
            <div className="w-5 h-5 rounded-full bg-white border-4 border-charcoal-950 z-10" />
          </div>

          <div className="text-center mt-3">
            <span className="text-3xl font-extrabold text-white tracking-tight">{currentAngle}°</span>
            <p className="text-xs font-medium text-slate-400 mt-0.5">
              Current Orientation: <span className="text-eco-400 font-semibold">{activeBin}</span>
            </p>
          </div>

          {/* Status Message */}
          <div className={`mt-3 px-3 py-1.5 rounded-lg text-xs font-medium text-center ${
            isEstop ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'bg-slate-800 text-slate-300'
          }`}>
            {statusMessage}
          </div>
        </div>

        {/* Test Trigger Grid */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
            Simulate Waste Item Detection
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {bins.filter((b) => b.category !== 'Neutral').map((bin) => (
              <button
                key={bin.name}
                onClick={() => handleTrigger(bin.category, bin.angle)}
                disabled={isEstop}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left transition-all hover:scale-[1.02] disabled:opacity-40"
              >
                <div className="text-[11px] font-semibold text-white truncate">{bin.name}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Servo: {bin.angle}°</div>
              </button>
            ))}
          </div>
        </div>

        {/* Safety & Emergency Controls */}
        <div className="flex items-center gap-3 mb-6 p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
          <button
            onClick={handleEstop}
            disabled={isEstop}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition-all disabled:opacity-40"
          >
            <AlertOctagon className="w-4 h-4" />
            EMERGENCY STOP
          </button>
          <button
            onClick={handleReset}
            disabled={!isEstop}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-slate-200 flex items-center justify-center gap-2 transition-all disabled:opacity-40"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Safety Lock
          </button>
        </div>

        {/* Live Hardware Telemetry Log */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Hardware Command & Execution Telemetry
          </label>
          <div className="h-32 overflow-y-auto rounded-xl bg-charcoal-950 p-3 font-mono text-[11px] space-y-1.5 border border-slate-800">
            {logs.map((log) => (
              <div key={log.id} className={log.isError ? 'text-rose-400' : 'text-slate-300'}>
                <span className="text-slate-500">[{log.time}]</span> {log.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
