'use client';

import React, { useState, useEffect } from 'react';
import {
  Fingerprint,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Layers,
  History,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { EcoTwinRecord, LifecycleStatus, WasteLifecycleEvent } from '../../../shared/types/detection';

const STATUS_COLORS: Record<string, string> = {
  detected: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  classified: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  needs_review: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  recommendation_generated: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  action_confirmed: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  closed: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

const CATEGORIES = ['All', 'Plastics', 'Paper', 'Metal', 'Glass', 'Organic', 'E-Waste', 'Landfill'];
const LIFECYCLE_STATUSES = ['All', 'detected', 'classified', 'needs_review', 'recommendation_generated', 'action_confirmed', 'closed'];

export default function EcoTwinView() {
  const { token } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [lifecycleStatus, setLifecycleStatus] = useState('All');
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await api.getEcoTwinRecords(
        {
          search: search || undefined,
          category: category !== 'All' ? category : undefined,
          lifecycleStatus: lifecycleStatus !== 'All' ? lifecycleStatus : undefined,
        },
        token
      );
      setRecords(res.records || []);
    } catch (err: any) {
      console.error('Failed to load EcoTwin records', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [category, lifecycleStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRecords();
  };

  const openRecordDetails = async (record: any) => {
    setSelectedRecord(record);
    try {
      setTimelineLoading(true);
      const timelineData = await api.getEcoTwinTimeline(record.recordId, token);
      setSelectedRecord((prev: any) => ({
        ...prev,
        lifecycleEvents: timelineData.timeline,
        corrections: timelineData.corrections,
      }));
    } catch (err) {
      console.error('Failed to load timeline', err);
    } finally {
      setTimelineLoading(false);
    }
  };

  const handleConfirmAction = async (recordId: string) => {
    try {
      setActionSuccess(null);
      setActionError(null);
      const res = await api.recordEcoLoopAction(
        {
          recordId,
          actionType: 'segregated_correctly',
          disposalBinSelected: selectedRecord?.wasteCategory,
        },
        token
      );
      setActionSuccess(`Action verified! +${res.pointsAwarded} EcoPoints awarded.`);
      // Update record state locally
      setSelectedRecord((prev: any) => ({
        ...prev,
        lifecycleStatus: 'action_confirmed',
        actionConfirmed: true,
      }));
      fetchRecords();
    } catch (err: any) {
      setActionError(err.message || 'Action claim failed');
    }
  };

  const handleTransitionStatus = async (recordId: string, newStatus: string) => {
    try {
      await api.updateEcoTwinStatus(recordId, newStatus, 'Status manually updated via EcoTwin inspector', token);
      setSelectedRecord((prev: any) => ({ ...prev, lifecycleStatus: newStatus }));
      fetchRecords();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Module Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 p-8 border border-emerald-500/20 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <Fingerprint className="w-3.5 h-3.5" /> Innovation Module 01
              </span>
              <span className="text-xs text-slate-400">Item-Level Digital Identity</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              EcoTwin™ Waste Identity & Lifecycle
            </h1>
            <p className="text-slate-300 max-w-2xl text-sm leading-relaxed">
              Every analyzed waste item receives a persistent digital identity (<span className="text-emerald-400 font-mono">ECO-XXXX</span>) and an immutable audit trail from initial spatial localization through fine-grained verification, contamination inspection, and user-confirmed segregation.
            </p>
          </div>
          <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700/60 p-4 rounded-xl flex items-center gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-emerald-400 font-mono">{records.length}</div>
              <div className="text-xs text-slate-400">Tracked Items</div>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div>
              <div className="text-2xl font-bold text-white font-mono">
                {records.filter((r) => r.lifecycleStatus === 'action_confirmed').length}
              </div>
              <div className="text-xs text-slate-400">Segregated</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search record ID (e.g. ECO-1024), material, or tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Category Dropdown */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'All' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <select
            value={lifecycleStatus}
            onChange={(e) => setLifecycleStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
          >
            {LIFECYCLE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status === 'All' ? 'All Lifecycle Stages' : status.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Waste Records Grid */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-sm">Querying EcoTwin ledger...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="py-16 text-center bg-slate-900/40 rounded-xl border border-slate-800 space-y-3">
          <Fingerprint className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-medium text-slate-300">No EcoTwin digital identities found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Upload images or analyze live webcam streams in the Detection Studio to generate persistent waste identity records.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {records.map((rec) => {
            const statusClass = STATUS_COLORS[rec.lifecycleStatus] || 'bg-slate-800 text-slate-300';
            return (
              <div
                key={rec._id || rec.recordId}
                onClick={() => openRecordDetails(rec)}
                className="group cursor-pointer bg-slate-900/70 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/40 rounded-xl p-5 transition-all duration-200 shadow-lg hover:shadow-emerald-950/20 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-500/30 flex items-center gap-1.5">
                      <Fingerprint className="w-3 h-3" /> {rec.recordId}
                    </span>
                    <span className={`text-[11px] font-semibold uppercase px-2.5 py-0.5 rounded-full border ${statusClass}`}>
                      {rec.lifecycleStatus?.replace('_', ' ')}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-white capitalize group-hover:text-emerald-300 transition-colors">
                      {rec.finalClassification}
                    </h3>
                    <p className="text-xs text-slate-400">Stream: {rec.wasteCategory}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                      <div className="text-[10px] text-slate-500 uppercase">Detection Conf</div>
                      <div className="font-mono font-medium text-slate-200">
                        {Math.round(rec.confidenceScore * 100)}%
                      </div>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                      <div className="text-[10px] text-slate-500 uppercase">Readiness</div>
                      <div className="font-mono font-medium text-emerald-400">
                        {rec.segregationReadiness?.score ?? 90}%
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(rec.createdAt).toLocaleDateString()}
                  </span>
                  <span className="text-emerald-400 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    Inspect Timeline <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Record Inspection Drawer / Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl p-6 md:p-8 shadow-2xl space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-md border border-emerald-500/30 flex items-center gap-1.5">
                    <Fingerprint className="w-4 h-4" /> {selectedRecord.recordId}
                  </span>
                  <span className={`text-xs uppercase font-semibold px-2.5 py-1 rounded-full border ${STATUS_COLORS[selectedRecord.lifecycleStatus]}`}>
                    {selectedRecord.lifecycleStatus?.replace('_', ' ')}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-white capitalize">{selectedRecord.finalClassification}</h2>
                <p className="text-xs text-slate-400">
                  Assigned Category: <span className="text-slate-200 font-semibold">{selectedRecord.wasteCategory}</span>
                </p>
              </div>

              <button
                onClick={() => setSelectedRecord(null)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notifications */}
            {actionSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                {actionSuccess}
              </div>
            )}
            {actionError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-lg text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {actionError}
              </div>
            )}

            {/* AI Decision Pipeline Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Stage 1: Spatial Localization</div>
                <div className="text-white font-medium capitalize">{selectedRecord.yoloLabel}</div>
                <div className="text-slate-400 font-mono">Conf: {(selectedRecord.yoloConfidence * 100).toFixed(1)}%</div>
              </div>

              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Stage 2: Material Verification</div>
                <div className="text-white font-medium capitalize">{selectedRecord.cnnSubtype}</div>
                <div className="text-slate-400 font-mono">Conf: {(selectedRecord.cnnConfidence * 100).toFixed(1)}%</div>
              </div>

              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Stage 3: EcoGuard Inspection</div>
                <div className="text-white font-medium">
                  {selectedRecord.contaminationAssessment?.hasVisibleResidue ? 'Residue Flagged' : 'Clean Surface'}
                </div>
                <div className="text-slate-400 font-mono">
                  Cleanliness: {selectedRecord.contaminationAssessment?.cleanlinessScore ?? 95}%
                </div>
              </div>
            </div>

            {/* Lifecycle Timeline */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-400" /> Immutable Decision & Lifecycle Timeline
              </h4>

              {timelineLoading ? (
                <div className="py-6 text-center text-xs text-slate-500">Loading audit events...</div>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                  {(selectedRecord.lifecycleEvents || []).map((evt: WasteLifecycleEvent, idx: number) => (
                    <div key={idx} className="relative group">
                      <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-emerald-500/20 border-2 border-emerald-500" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-200 uppercase">{evt.eventType?.replace('_', ' ')}</span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">{evt.note || `Transitioned status to ${evt.newStatus}`}</p>
                        <div className="text-[10px] text-slate-500 font-mono">Actor: {evt.actor}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Change State:</span>
                <select
                  value={selectedRecord.lifecycleStatus}
                  onChange={(e) => handleTransitionStatus(selectedRecord.recordId, e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                >
                  {LIFECYCLE_STATUSES.filter((s) => s !== 'All').map((s) => (
                    <option key={s} value={s}>
                      {s.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              {!selectedRecord.actionConfirmed && selectedRecord.lifecycleStatus !== 'closed' && (
                <button
                  onClick={() => handleConfirmAction(selectedRecord.recordId)}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-emerald-950/40 flex items-center gap-1.5 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Confirm Physical Disposal (+25 Pts)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
