'use client';

import React, { useState } from 'react';
import { Download, ArrowLeft, CheckCircle, AlertTriangle, HelpCircle, Layers, Cpu, Sparkles, Recycle } from 'lucide-react';
import { COLOR_PALETTE_BY_CATEGORY, WasteCategory } from '@shared/constants/categories';

interface DetectionResultsViewProps {
  results: any;
  onBackToStudio: () => void;
}

export function DetectionResultsView({ results, onBackToStudio }: DetectionResultsViewProps) {
  const [selectedDetectionId, setSelectedDetectionId] = useState<string | null>(null);

  const session = results?.session || {};
  const detections = results?.detections || results?.aiResult?.detections || [];
  const annotatedImage = results?.annotatedImage || results?.aiResult?.annotated_image_base64 || results?.aiResult?.representative_frames_base64?.[0];
  const processingTime = results?.processingTimeMs || results?.aiResult?.processing_time_ms || 0;
  const yoloModel = results?.yoloModel || 'YOLOv8n';
  const cnnModel = results?.cnnModel || 'WasteConvNet-PyTorch';

  const downloadJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(results, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `ecovision_detection_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const downloadCsv = () => {
    let csv = 'ID,Final Classification,Category,Spatial Conf,Material Conf,Fused Conf,Review Status,Recyclable,Disposal Method\n';
    detections.forEach((d: any) => {
      const rec = d.disposalRecommendation || d.disposal_recommendation || {};
      csv += `"${d._id || d.id}","${d.finalClassification || d.final_classification}","${d.wasteCategory || d.waste_category}",${d.yoloConfidence || d.yolo_confidence},${d.cnnConfidence || d.cnn_confidence},${d.confidenceScore || d.confidence_score},"${d.reviewStatus || d.review_status}",${rec.recyclingEligibility || rec.recycling_eligibility || false},"${rec.suggestedDisposal || rec.suggested_disposal || ''}"\n`;
    });
    const dataStr = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `ecovision_detection_${Date.now()}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      {/* Top Bar Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <button
            onClick={onBackToStudio}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Detection Studio
          </button>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
            Inference & Decision Fusion Results
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-eco-500/10 text-eco-400 border border-eco-500/30">
              {detections.length} Items Identified
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Processed in <strong className="text-slate-200">{processingTime} ms</strong> using{' '}
            <strong className="text-slate-200">Real-Time Spatial Detection</strong> and{' '}
            <strong className="text-slate-200">Deep Material Verification</strong>.
          </p>
        </div>

        {/* Download Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={downloadCsv}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            Export CSV
          </button>
          <button
            onClick={downloadJson}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-eco-400" />
            Export JSON
          </button>
        </div>
      </div>

      {/* Main Results Showcase Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Annotated Image Canvas */}
        <div className="lg:col-span-7 space-y-4">
          <div className="glass-panel rounded-3xl p-4 border border-slate-800 relative overflow-hidden bg-charcoal-950/80">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-3 px-2">
              <span>Annotated Output with Bounding Boxes</span>
              <span className="text-eco-400 font-mono text-[11px]">{detections.length} objects localized</span>
            </div>

            {annotatedImage ? (
              <img
                src={annotatedImage}
                alt="Annotated detection visual"
                className="w-full h-auto rounded-2xl border border-slate-800 object-contain max-h-[500px] shadow-2xl mx-auto"
              />
            ) : (
              <div className="h-64 flex items-center justify-center text-xs text-slate-500">
                Annotated frame preview unavailable
              </div>
            )}
          </div>
        </div>

        {/* Right: Item Breakdown & Disposal Instructions */}
        <div className="lg:col-span-5 space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Detected Objects & Disposal Actions
          </div>

          <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
            {detections.length === 0 ? (
              <div className="glass-panel rounded-2xl p-6 text-center text-xs text-slate-400 border border-slate-800">
                No objects met the current confidence threshold. Consider lowering the confidence slider in the studio.
              </div>
            ) : (
              detections.map((det: any, idx: number) => {
                const detId = det._id || det.id || idx.toString();
                const isSelected = selectedDetectionId === detId;
                const rec = det.disposalRecommendation || det.disposal_recommendation || {};
                const wasteCat = (det.wasteCategory || det.waste_category || 'Unknown or needs review') as WasteCategory;
                const colorConfig = COLOR_PALETTE_BY_CATEGORY[wasteCat] || COLOR_PALETTE_BY_CATEGORY['Other or mixed waste'];

                return (
                  <div
                    key={detId}
                    onClick={() => setSelectedDetectionId(detId)}
                    className={`cursor-pointer rounded-2xl p-4 transition-all border ${
                      isSelected
                        ? 'bg-slate-800/90 border-eco-500 shadow-lg shadow-eco-500/10'
                        : 'glass-panel border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                            {det.recordId || det.record_id || `ECO-${1000 + idx * 7}`}
                          </span>
                          <span className="text-sm font-bold text-white capitalize">
                            {det.finalClassification || det.final_classification}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colorConfig.bg} ${colorConfig.text} border ${colorConfig.border}`}>
                            {wasteCat}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Detected: <strong className="text-slate-300 font-medium">{det.yoloLabel || det.yolo_label}</strong> ({Math.round((det.yoloConfidence || det.yolo_confidence) * 100)}%) • Subtype: <strong className="text-slate-300 font-medium">{det.cnnSubtype || det.cnn_subtype}</strong> ({Math.round((det.cnnConfidence || det.cnn_confidence) * 100)}%)
                        </p>
                      </div>

                      {/* Recyclability Status Pill */}
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-lg shrink-0 ${
                        rec.recyclingEligibility || rec.recycling_eligibility
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}>
                        {rec.recyclingEligibility || rec.recycling_eligibility ? 'Recyclable' : 'Special / Residual'}
                      </span>
                    </div>

                    {/* Contamination & Readiness Bar */}
                    <div className="mt-2 flex items-center justify-between text-[11px] bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
                      <span className="text-slate-400">
                        {det.contamination_assessment?.has_visible_residue || det.contaminationAssessment?.hasVisibleResidue ? (
                          <span className="text-amber-400 font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Residue Detected ({det.contamination_assessment?.residue_type || det.contaminationAssessment?.residueType})
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-medium flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Optical Surface Clean
                          </span>
                        )}
                      </span>
                      <span className="font-mono text-slate-300">
                        Readiness: <strong className="text-emerald-400">{det.segregation_readiness?.score || det.segregationReadiness?.score || 90}%</strong>
                      </span>
                    </div>

                    {/* Fused Recommendation Drawer */}
                    <div className="mt-3 pt-3 border-t border-slate-800/60 space-y-2 text-xs">
                      <div>
                        <span className="text-slate-400 text-[11px] font-medium block">Recommended Stream:</span>
                        <p className="text-slate-200 font-semibold text-xs mt-0.5">
                          {rec.suggestedDisposal || rec.suggested_disposal}
                        </p>
                      </div>

                      {/* Preparation Instructions */}
                      {(rec.preparationInstructions || rec.preparation_instructions)?.length > 0 && (
                        <div>
                          <span className="text-slate-400 text-[11px] font-medium block mb-1">Preparation Checklist:</span>
                          <ul className="space-y-1">
                            {(rec.preparationInstructions || rec.preparation_instructions).map((step: string, sIdx: number) => (
                              <li key={sIdx} className="text-[11px] text-slate-300 flex items-start gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-eco-400 mt-1.5 shrink-0" />
                                <span>{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Reason & Local Rule Notice */}
                      <p className="text-[10px] text-slate-500 italic pt-1">
                        Reason: {rec.reason}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Comprehensive Prediction & Probability Comparison Table */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800">
        <h3 className="text-base font-bold text-white mb-4">Detailed Model Comparison & Prediction Fusion Table</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-700/60">
              <tr>
                <th className="py-3 px-4">Item #</th>
                <th className="py-3 px-4">Detected Object</th>
                <th className="py-3 px-4">Detection Conf</th>
                <th className="py-3 px-4">Material Subtype</th>
                <th className="py-3 px-4">Subtype Conf</th>
                <th className="py-3 px-4">Fused Classification</th>
                <th className="py-3 px-4">Waste Category</th>
                <th className="py-3 px-4">Review Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {detections.map((det: any, idx: number) => {
                const status = det.reviewStatus || det.review_status || 'confirmed';
                return (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500">#{idx + 1}</td>
                    <td className="py-3 px-4 font-medium text-white">{det.yoloLabel || det.yolo_label}</td>
                    <td className="py-3 px-4">{Math.round((det.yoloConfidence || det.yolo_confidence) * 100)}%</td>
                    <td className="py-3 px-4 font-medium text-white">{det.cnnSubtype || det.cnn_subtype}</td>
                    <td className="py-3 px-4">{Math.round((det.cnnConfidence || det.cnn_confidence) * 100)}%</td>
                    <td className="py-3 px-4 font-bold text-eco-400">{det.finalClassification || det.final_classification}</td>
                    <td className="py-3 px-4">{det.wasteCategory || det.waste_category}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        status === 'confirmed'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : status === 'disputed'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}>
                        {status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
