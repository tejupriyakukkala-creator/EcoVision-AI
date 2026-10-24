'use client';

import React, { useState, useEffect } from 'react';
import { Search, Filter, Trash2, Eye, Calendar, ArrowRight, Download, X, Layers } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { WASTE_CATEGORIES, COLOR_PALETTE_BY_CATEGORY, WasteCategory } from '@shared/constants/categories';

export function HistoryView() {
  const { token } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Detail Modal
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [sessionDetections, setSessionDetections] = useState<any[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, [pagination.page, selectedCategory, search, startDate, endDate]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await api.getSessions(
        {
          page: pagination.page,
          limit: pagination.limit,
          category: selectedCategory,
          search,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
        token
      );
      setSessions(res.sessions || []);
      setPagination(res.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
      setIsLoading(false);
    } catch {
      setIsLoading(false);
    }
  };

  const handleOpenDetail = async (id: string) => {
    setIsLoadingDetail(true);
    try {
      const res = await api.getSessionById(id, token);
      setSelectedSession(res.session);
      setSessionDetections(res.detections || []);
      setIsLoadingDetail(false);
    } catch {
      setIsLoadingDetail(false);
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!confirm('Are you sure you want to delete this detection record?')) return;
    try {
      await api.deleteSession(id, token);
      if (selectedSession?._id === id) setSelectedSession(null);
      fetchHistory();
    } catch (err: any) {
      alert(err.message || 'Failed to delete record');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6">
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-eco-500/10 text-eco-400 border border-eco-500/30 uppercase tracking-wider">
          Auditable Archive
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">Detection Session History</h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Review, reopen, and export historical multi-object detection sessions and segregation guidance logs.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            placeholder="Search by object label or material..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-eco-500"
          />
        </div>

        {/* Category Dropdown */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-eco-500"
          >
            <option value="All">All Categories</option>
            {WASTE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Date Filters */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
            title="Start Date"
          />
          <span>to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
            title="End Date"
          />
        </div>
      </div>

      {/* History Table */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading detection records...</div>
        ) : sessions.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No detection sessions found matching the query. Use Detection Studio to record new analyses.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-700">
                <tr>
                  <th className="py-3.5 px-4">Session Date</th>
                  <th className="py-3.5 px-4">Mode</th>
                  <th className="py-3.5 px-4">Objects Found</th>
                  <th className="py-3.5 px-4">Processing Time</th>
                  <th className="py-3.5 px-4">Source Name</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {sessions.map((sess) => (
                  <tr key={sess._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {new Date(sess.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                        {sess.inputType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-white">{sess.totalObjects}</span> items
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">{sess.processingTimeMs} ms</td>
                    <td className="py-3.5 px-4 max-w-[180px] truncate text-slate-400">
                      {sess.originalFilename || 'Webcam Stream'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenDetail(sess._id)}
                          className="px-2.5 py-1 rounded-lg bg-eco-500/15 hover:bg-eco-500/25 text-eco-400 border border-eco-500/30 flex items-center gap-1 font-semibold"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                        <button
                          onClick={() => handleDeleteSession(sess._id)}
                          className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete Session"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} records)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Session Detail Drawer / Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-3xl glass-panel rounded-3xl p-6 sm:p-8 border border-slate-700 shadow-2xl bg-charcoal-900 max-h-[90vh] overflow-y-auto space-y-6">
            <button
              onClick={() => setSelectedSession(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-eco-500/10 text-eco-400 border border-eco-500/30 uppercase">
                Session Inspection
              </span>
              <h3 className="text-xl font-bold text-white mt-1">Detection Session #{selectedSession._id}</h3>
              <p className="text-xs text-slate-400">
                Created on {new Date(selectedSession.createdAt).toLocaleString()} • Total Items: {sessionDetections.length}
              </p>
            </div>

            {/* Annotated Image if stored */}
            {selectedSession.annotatedImageUrl && (
              <div className="rounded-2xl overflow-hidden border border-slate-800 bg-charcoal-950">
                <img
                  src={selectedSession.annotatedImageUrl}
                  alt="Saved annotated output"
                  className="w-full max-h-72 object-contain mx-auto"
                />
              </div>
            )}

            {/* Detections List */}
            <div className="space-y-3">
              <span className="text-xs font-semibold text-slate-300 block">Classified Waste Objects</span>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {sessionDetections.map((d: any, idx: number) => {
                  const cat = d.wasteCategory as WasteCategory;
                  const color = COLOR_PALETTE_BY_CATEGORY[cat] || COLOR_PALETTE_BY_CATEGORY['Other or mixed waste'];
                  return (
                    <div key={idx} className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80 flex items-start justify-between gap-4 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white capitalize">{d.finalClassification}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${color.bg} ${color.text} border ${color.border}`}>
                            {d.wasteCategory}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Action: {d.disposalRecommendation?.suggestedDisposal}
                        </p>
                      </div>
                      <div className="text-right text-[11px] text-slate-400 font-mono">
                        <div>Conf: {Math.round(d.confidenceScore * 100)}%</div>
                        <div className="capitalize text-emerald-400">{d.reviewStatus}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
