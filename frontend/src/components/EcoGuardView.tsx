'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Edit3,
  Sliders,
  Filter,
  Eye,
  Check,
  X,
  Sparkles,
  Info,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { WASTE_CATEGORIES } from '../../../shared/constants/categories';

const PRIORITY_BADGES: Record<string, string> = {
  critical: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  high: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  low: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  none: 'bg-slate-800 text-slate-400 border-slate-700',
};

const CORRECTION_REASONS = [
  'Reflective glare or shadow confused spatial contour detector',
  'Crushed or folded packaging distorted shape features',
  'Multi-layer composite material requires dedicated sorting stream',
  'Visible food/liquid residue makes item unrecyclable curbside',
  'Rare or unusual industrial packaging variant',
  'Material subtype recognized but spatial detector missed context',
];

export default function EcoGuardView() {
  const { token } = useAuth();
  const [queue, setQueue] = useState<any[]>([]);
  const [agreementMetrics, setAgreementMetrics] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [correctedPrediction, setCorrectedPrediction] = useState('');
  const [correctedCategory, setCorrectedCategory] = useState('Plastics');
  const [reason, setReason] = useState(CORRECTION_REASONS[0]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [queueRes, metricsRes] = await Promise.all([
        api.getReviewQueue({}, token),
        api.getModelAgreement(),
      ]);
      setQueue(queueRes.queue || []);
      setAgreementMetrics(metricsRes);
    } catch (err) {
      console.error('Failed to load EcoGuard review data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCorrectionModal = (record: any) => {
    setSelectedRecord(record);
    setCorrectedPrediction(record.finalClassification);
    setCorrectedCategory(record.wasteCategory);
    setReason(CORRECTION_REASONS[0]);
    setNotes('');
    setSuccessMsg(null);
  };

  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    try {
      setSubmitting(true);
      await api.submitCorrection(
        selectedRecord.recordId,
        {
          correctedPrediction,
          correctedCategory,
          reason,
          notes,
        },
        token
      );
      setSuccessMsg(`Correction applied to ${selectedRecord.recordId}. Record updated and quarantined for retraining audit.`);
      setTimeout(() => {
        setSelectedRecord(null);
        fetchData();
      }, 1400);
    } catch (err: any) {
      alert(err.message || 'Failed to submit correction');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 p-8 border border-amber-500/20 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" /> Innovation Module 02
              </span>
              <span className="text-xs text-slate-400">Confidence-Aware AI & Quality Sentinel</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              EcoGuard™ Uncertainty Sentinel
            </h1>
            <p className="text-slate-300 max-w-2xl text-sm leading-relaxed">
              Autonomous oversight comparing multi-stage spatial object localization against fine-grained material classification. Items with model disagreements, low confidence, or visible surface contamination are intercepted and routed to this human-in-the-loop review queue.
            </p>
          </div>
          <button
            onClick={fetchData}
            className="self-start md:self-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Queue
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400 font-medium">Model Agreement</div>
          <div className="text-2xl font-bold text-white font-mono">
            {agreementMetrics?.agreementRatePercent ?? 92}%
          </div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Dual-Model Consensus
          </div>
        </div>

        <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400 font-medium">Segregation Readiness</div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {agreementMetrics?.averageReadinessScore ?? 88}%
          </div>
          <div className="text-[11px] text-slate-400">Weighted readiness index</div>
        </div>

        <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400 font-medium">Flagged Items in Queue</div>
          <div className="text-2xl font-bold text-amber-400 font-mono">
            {queue.length}
          </div>
          <div className="text-[11px] text-slate-400">Pending review action</div>
        </div>

        <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400 font-medium">Cleanliness Compliance</div>
          <div className="text-2xl font-bold text-cyan-400 font-mono">
            {agreementMetrics?.cleanlinessCompliancePercent ?? 95}%
          </div>
          <div className="text-[11px] text-slate-400">Optical residue pass rate</div>
        </div>
      </div>

      {/* Review Queue Table */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" /> Pending Review Items ({queue.length})
          </h3>
          <span className="text-xs text-slate-400">Corrections are archived into training candidates</span>
        </div>

        {loading ? (
          <div className="py-16 text-center space-y-2">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-slate-400 text-xs">Loading EcoGuard queue...</p>
          </div>
        ) : queue.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500/80 mx-auto" />
            <h4 className="text-base font-medium text-slate-200">Review Queue is Clear!</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              All detected objects satisfy confidence and model consensus thresholds. High-uncertainty items will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Item Identity</th>
                  <th className="py-3 px-4">Spatial Object</th>
                  <th className="py-3 px-4">Material Subtype</th>
                  <th className="py-3 px-4">Consensus Status</th>
                  <th className="py-3 px-4">Contamination</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {queue.map((item) => {
                  const isDisputed = item.modelAgreement === 'disputed';
                  const priorityClass = PRIORITY_BADGES[item.reviewPriority] || PRIORITY_BADGES.medium;

                  return (
                    <tr key={item._id || item.recordId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-medium text-emerald-400">
                        {item.recordId}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-200 capitalize">
                        {item.yoloLabel}
                        <span className="text-slate-500 text-[10px] block font-mono">
                          {(item.yoloConfidence * 100).toFixed(0)}% conf
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-200 capitalize">
                        {item.cnnSubtype}
                        <span className="text-slate-500 text-[10px] block font-mono">
                          {(item.cnnConfidence * 100).toFixed(0)}% conf
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            isDisputed
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {item.modelAgreement?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {item.contaminationAssessment?.hasVisibleResidue ? (
                          <span className="text-amber-400 font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Residue ({item.contaminationAssessment.residueType})
                          </span>
                        ) : (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Clean ({item.contaminationAssessment?.cleanlinessScore ?? 95}%)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${priorityClass}`}>
                          {item.reviewPriority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => openCorrectionModal(item)}
                          className="px-3 py-1.5 bg-emerald-600/80 hover:bg-emerald-600 text-white font-medium rounded-lg text-xs transition-colors inline-flex items-center gap-1.5 shadow"
                        >
                          <Edit3 className="w-3 h-3" /> Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review & Correction Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 md:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-400" /> Review Classification
                </h3>
                <p className="text-xs text-slate-400 font-mono">Record: {selectedRecord.recordId}</p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {successMsg ? (
              <div className="py-6 text-center space-y-2 text-emerald-400">
                <CheckCircle2 className="w-10 h-10 mx-auto" />
                <p className="text-sm font-semibold">{successMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleCorrectionSubmit} className="space-y-4 text-xs">
                {/* Comparison Box */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 grid grid-cols-2 gap-3 text-center">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">Spatial Detection</div>
                    <div className="font-semibold text-slate-200 capitalize mt-0.5">{selectedRecord.yoloLabel}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{(selectedRecord.yoloConfidence * 100).toFixed(0)}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">Material Subtype</div>
                    <div className="font-semibold text-slate-200 capitalize mt-0.5">{selectedRecord.cnnSubtype}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{(selectedRecord.cnnConfidence * 100).toFixed(0)}%</div>
                  </div>
                </div>

                {/* Corrected Subtype Input */}
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Verified Subtype / Material Name</label>
                  <input
                    type="text"
                    required
                    value={correctedPrediction}
                    onChange={(e) => setCorrectedPrediction(e.target.value)}
                    placeholder="e.g. plastic bottle, metal can, pizza box..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Target Category */}
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Assigned Waste Stream</label>
                  <select
                    value={correctedCategory}
                    onChange={(e) => setCorrectedCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    {WASTE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Correction Reason */}
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Justification / Reason</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    {CORRECTION_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Additional Notes */}
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Reviewer Audit Notes (Optional)</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any specific optical cues observed by reviewer..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRecord(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow-lg flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {submitting ? 'Applying...' : 'Apply & Verify'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
