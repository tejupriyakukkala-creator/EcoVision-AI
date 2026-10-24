'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Upload, Video, Camera, Sliders, RefreshCw, Sparkles, AlertCircle, Play, Pause, Square, CheckCircle2, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface DetectionStudioProps {
  onDetectionComplete: (results: any) => void;
}

export function DetectionStudio({ onDetectionComplete }: DetectionStudioProps) {
  const { token } = useAuth();
  const [activeMode, setActiveMode] = useState<'image' | 'video' | 'webcam'>('image');
  const [confidence, setConfidence] = useState<number>(0.25);
  const [sampleInterval, setSampleInterval] = useState<number>(15);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Webcam State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isWebcamActive, setIsWebcamActive] = useState<boolean>(false);
  const [isWebcamPaused, setIsWebcamPaused] = useState<boolean>(false);
  const [webcamDetections, setWebcamDetections] = useState<any[]>([]);
  const [lastFrameTimeMs, setLastFrameTimeMs] = useState<number>(0);
  const webcamIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up webcam stream on unmount
  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setError(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // 1-Click Sample Generators for immediate verification
  const loadSampleWasteImage = async (subtype: string) => {
    setError(null);
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background surface
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 640, 480);

    if (subtype === 'plastic bottle') {
      // Draw transparent blue plastic bottle shape
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.roundRect(260, 140, 120, 260, 24);
      ctx.fill();
      // Cap
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(290, 100, 60, 40);
      // Label band
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(260, 240, 120, 70);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('SPRING WATER', 265, 280);
    } else if (subtype === 'metal can') {
      // Aluminum soda can
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.roundRect(250, 150, 140, 220, 20);
      ctx.fill();
      // Metallic rims
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(250, 140, 140, 20);
      ctx.fillRect(250, 360, 140, 15);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('COLA 330ml', 265, 260);
    } else if (subtype === 'cardboard') {
      // Corrugated brown box
      ctx.fillStyle = '#b45309';
      ctx.fillRect(180, 160, 280, 200);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(200, 160, 30, 200);
      ctx.fillRect(410, 160, 30, 200);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 4;
      ctx.strokeRect(180, 160, 280, 200);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('FRAGILE - RECYCLED CARDBOARD', 195, 270);
    } else if (subtype === 'food scraps') {
      // Organic apple core / banana peel
      ctx.fillStyle = '#84cc16';
      ctx.beginPath();
      ctx.ellipse(320, 260, 90, 120, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#78350f';
      ctx.fillRect(315, 120, 10, 30);
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.ellipse(340, 130, 25, 12, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
    }

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `${subtype.replace(' ', '_')}_sample.jpg`, { type: 'image/jpeg' });
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
      }
    }, 'image/jpeg');
  };

  // Submit Image or Video for Processing
  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError('Please upload or select an image or video file.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('confidence', confidence.toString());
      formData.append('inputType', activeMode);
      if (activeMode === 'video') {
        formData.append('sampleInterval', sampleInterval.toString());
      }

      const res = await api.detectMedia(formData, token);
      setIsProcessing(false);
      onDetectionComplete(res);
    } catch (err: any) {
      setIsProcessing(false);
      setError(err.message || 'Detection failed. Ensure backend and AI service are running.');
    }
  };

  // Webcam Controls
  const startWebcam = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'environment' },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsWebcamActive(true);
        setIsWebcamPaused(false);

        // Frame polling loop (every 750ms to prevent service choking)
        webcamIntervalRef.current = setInterval(captureAndSendWebcamFrame, 750);
      }
    } catch (err: any) {
      setError(`Camera access denied or unavailable: ${err.message}. Please check browser camera permissions.`);
      setIsWebcamActive(false);
    }
  };

  const stopWebcam = () => {
    if (webcamIntervalRef.current) {
      clearInterval(webcamIntervalRef.current);
      webcamIntervalRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsWebcamActive(false);
    setIsWebcamPaused(false);
    setWebcamDetections([]);
  };

  const togglePauseWebcam = () => {
    if (isWebcamPaused) {
      setIsWebcamPaused(false);
      webcamIntervalRef.current = setInterval(captureAndSendWebcamFrame, 750);
    } else {
      setIsWebcamPaused(true);
      if (webcamIntervalRef.current) {
        clearInterval(webcamIntervalRef.current);
        webcamIntervalRef.current = null;
      }
    }
  };

  const captureAndSendWebcamFrame = async (saveToHistory: boolean = false) => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const b64 = canvas.toDataURL('image/jpeg', 0.85);

    try {
      const res = await api.detectWebcamFrame(b64, confidence, saveToHistory, token);
      if (res.aiResult) {
        setWebcamDetections(res.aiResult.detections || []);
        setLastFrameTimeMs(res.aiResult.processing_time_ms || 0);

        // Draw bounding boxes on canvas
        drawOverlayBoundingBoxes(ctx, res.aiResult.detections || []);

        if (saveToHistory) {
          onDetectionComplete({
            session: res.session,
            detections: res.aiResult.detections,
            annotatedImage: res.aiResult.annotated_frame_base64,
            processingTimeMs: res.aiResult.processing_time_ms,
            yoloModel: 'YOLOv8n-COCO',
            cnnModel: 'WasteConvNet-PyTorch',
          });
        }
      }
    } catch (err: any) {
      console.warn('[Webcam Frame]', err.message);
    }
  };

  const drawOverlayBoundingBoxes = (ctx: CanvasRenderingContext2D, detections: any[]) => {
    for (const det of detections) {
      const { x1, y1, x2, y2 } = det.bbox;
      const w = x2 - x1;
      const h = y2 - y1;

      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.strokeRect(x1, y1, w, h);

      // Label
      const tag = `${det.final_classification} (${Math.round(det.confidence_score * 100)}%)`;
      ctx.fillStyle = '#10b981';
      ctx.fillRect(x1, Math.max(0, y1 - 24), ctx.measureText(tag).width + 16, 24);

      ctx.fillStyle = '#090d16';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(tag, x1 + 8, Math.max(16, y1 - 7));
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-eco-500/10 text-eco-400 border border-eco-500/30 uppercase tracking-wider">
            Inference Studio
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">Multi-Modal Waste Detection Workspace</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Choose an input source to trigger simultaneous spatial localization, fine-grained material classification, and automated segregation logic.
          </p>
        </div>

        {/* Input Mode Selector */}
        <div className="flex items-center p-1 rounded-xl bg-slate-800/80 border border-slate-700/80 self-start sm:self-auto">
          <button
            onClick={() => {
              stopWebcam();
              setActiveMode('image');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeMode === 'image' ? 'bg-eco-500 text-charcoal-950 shadow-md' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Image Mode
          </button>
          <button
            onClick={() => {
              stopWebcam();
              setActiveMode('video');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeMode === 'video' ? 'bg-eco-500 text-charcoal-950 shadow-md' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            Video Mode
          </button>
          <button
            onClick={() => setActiveMode('webcam')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeMode === 'webcam' ? 'bg-eco-500 text-charcoal-950 shadow-md' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            Live Webcam
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Confidence & Sampling Controls Bar */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-6 border border-slate-800">
        <div className="flex items-center gap-4 flex-1 min-w-[260px]">
          <Sliders className="w-4 h-4 text-eco-400 shrink-0" />
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1">
              <span>Detection Confidence Threshold</span>
              <span className="text-eco-400 font-bold">{Math.round(confidence * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.10"
              max="0.85"
              step="0.05"
              value={confidence}
              onChange={(e) => setConfidence(parseFloat(e.target.value))}
              className="w-full accent-eco-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
            />
          </div>
        </div>

        {activeMode === 'video' && (
          <div className="flex items-center gap-4 flex-1 min-w-[240px]">
            <RefreshCw className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1">
                <span>Video Sample Rate</span>
                <span className="text-cyan-400 font-bold">Every {sampleInterval} frames</span>
              </div>
              <input
                type="range"
                min="5"
                max="45"
                step="5"
                value={sampleInterval}
                onChange={(e) => setSampleInterval(parseInt(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
              />
            </div>
          </div>
        )}
      </div>

      {/* Mode Workspace Area */}
      {activeMode === 'image' && (
        <div className="space-y-6">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-slate-700 hover:border-eco-500/60 rounded-3xl p-8 sm:p-12 text-center glass-panel transition-all bg-charcoal-900/40 relative"
          >
            <input
              type="file"
              id="imageUpload"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {previewUrl ? (
              <div className="max-w-md mx-auto space-y-4">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-72 mx-auto rounded-2xl shadow-xl object-contain border border-slate-700"
                />
                <p className="text-xs text-slate-400 truncate">{selectedFile?.name}</p>
                <div className="flex items-center justify-center gap-3">
                  <label
                    htmlFor="imageUpload"
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer border border-slate-700 transition-colors"
                  >
                    Change Image
                  </label>
                  <button
                    onClick={handleAnalyze}
                    disabled={isProcessing}
                    className="px-6 py-2.5 rounded-xl bg-eco-500 hover:bg-eco-600 text-charcoal-950 text-xs font-bold flex items-center gap-2 shadow-lg shadow-eco-500/25 transition-all hover:scale-105 disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-charcoal-950 border-t-transparent rounded-full animate-spin" />
                        <span>Analyzing Materials...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Run Full Intelligent Inference</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-eco-500/10 border border-eco-500/30 text-eco-400 flex items-center justify-center mx-auto mb-2">
                  <Upload className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-white">Drag & drop your waste image here</h3>
                <p className="text-xs text-slate-400">Supports JPEG, PNG, and WebP format up to 25MB</p>
                <label
                  htmlFor="imageUpload"
                  className="inline-block px-5 py-2.5 rounded-xl bg-eco-500 hover:bg-eco-600 text-charcoal-950 font-bold text-xs cursor-pointer shadow-lg shadow-eco-500/20 transition-all hover:scale-105"
                >
                  Browse Files
                </label>
              </div>
            )}
          </div>

          {/* Instant 1-Click Waste Verification Samples */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-3">
              1-Click Verification Test Samples (Instant Synthetic Testbed)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { name: 'Plastic Water Bottle', subtype: 'plastic bottle', color: 'border-cyan-500/40 text-cyan-400' },
                { name: 'Aluminum Soda Can', subtype: 'metal can', color: 'border-red-500/40 text-red-400' },
                { name: 'Cardboard Shipping Box', subtype: 'cardboard', color: 'border-amber-500/40 text-amber-400' },
                { name: 'Organic Apple Core', subtype: 'food scraps', color: 'border-lime-500/40 text-lime-400' },
              ].map((sample) => (
                <button
                  key={sample.subtype}
                  onClick={() => loadSampleWasteImage(sample.subtype)}
                  className={`p-3 rounded-xl bg-slate-800/60 hover:bg-slate-700/80 border ${sample.color} text-left transition-all hover:scale-[1.02]`}
                >
                  <p className="text-xs font-bold text-white">{sample.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Click to load</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeMode === 'video' && (
        <div className="border-2 border-dashed border-slate-700 rounded-3xl p-8 sm:p-12 text-center glass-panel bg-charcoal-900/40">
          <input
            type="file"
            id="videoUpload"
            accept="video/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {selectedFile && activeMode === 'video' ? (
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto">
                <Video className="w-8 h-8" />
              </div>
              <p className="text-sm font-bold text-white truncate">{selectedFile.name}</p>
              <p className="text-xs text-slate-400">
                Ready for frame sampling every {sampleInterval} frames with physical item deduplication.
              </p>
              <div className="flex items-center justify-center gap-3">
                <label
                  htmlFor="videoUpload"
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer border border-slate-700"
                >
                  Change Video
                </label>
                <button
                  onClick={handleAnalyze}
                  disabled={isProcessing}
                  className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-charcoal-950 text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/25 transition-all hover:scale-105 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-charcoal-950 border-t-transparent rounded-full animate-spin" />
                      <span>Tracking & Deduplicating Video Frames...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Run Video Multi-Frame Analysis</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto mb-2">
                <Video className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white">Upload a video to analyze conveyor or bin stream</h3>
              <p className="text-xs text-slate-400">Supports MP4, WebM, and MOV videos</p>
              <label
                htmlFor="videoUpload"
                className="inline-block px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-charcoal-950 font-bold text-xs cursor-pointer shadow-lg shadow-cyan-500/20 transition-all hover:scale-105"
              >
                Select Video File
              </label>
            </div>
          )}
        </div>
      )}

      {activeMode === 'webcam' && (
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 space-y-6">
          <div className="relative max-w-2xl mx-auto rounded-2xl overflow-hidden bg-charcoal-950 border border-slate-800 shadow-2xl aspect-[4/3] flex items-center justify-center">
            {/* Live HTML5 Video Element */}
            <video
              ref={videoRef}
              playsInline
              muted
              className={`w-full h-full object-cover ${isWebcamActive ? 'block' : 'hidden'}`}
            />
            {/* Overlay Canvas for Real-time Bounding Boxes */}
            <canvas
              ref={canvasRef}
              className={`absolute inset-0 w-full h-full pointer-events-none ${isWebcamActive ? 'block' : 'hidden'}`}
            />

            {!isWebcamActive && (
              <div className="text-center p-8 space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-eco-500/10 border border-eco-500/30 text-eco-400 flex items-center justify-center mx-auto">
                  <Camera className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-white">Browser Webcam Stream Inactive</h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  Click below to request camera permissions and start the real-time frame inference pipeline.
                </p>
                <button
                  onClick={startWebcam}
                  className="px-6 py-3 rounded-xl bg-eco-500 hover:bg-eco-600 text-charcoal-950 font-bold text-xs shadow-lg shadow-eco-500/20 transition-all hover:scale-105"
                >
                  Start Camera Feed
                </button>
              </div>
            )}

            {isWebcamActive && (
              <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-charcoal-900/80 backdrop-blur-md border border-slate-700 text-[11px] font-semibold text-white">
                <span className={`w-2 h-2 rounded-full ${isWebcamPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
                <span>{isWebcamPaused ? 'PAUSED' : 'LIVE DETECTING'}</span>
                <span className="text-slate-400 text-[10px]">({lastFrameTimeMs} ms)</span>
              </div>
            )}
          </div>

          {/* Webcam Control Bar */}
          {isWebcamActive && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={togglePauseWebcam}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700"
              >
                {isWebcamPaused ? <Play className="w-4 h-4 text-emerald-400 fill-current" /> : <Pause className="w-4 h-4 text-amber-400" />}
                {isWebcamPaused ? 'Resume Inference' : 'Pause Analysis'}
              </button>
              <button
                onClick={() => captureAndSendWebcamFrame(true)}
                className="px-5 py-2 rounded-xl bg-eco-500 hover:bg-eco-600 text-charcoal-950 text-xs font-bold flex items-center gap-2 shadow-md shadow-eco-500/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                Save Snapshot to History
              </button>
              <button
                onClick={stopWebcam}
                className="px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 text-xs font-semibold flex items-center gap-2 border border-rose-500/30"
              >
                <Square className="w-4 h-4 fill-current" />
                Stop Camera
              </button>
            </div>
          )}

          {/* Real-Time Live Webcam Detection Ticker */}
          {webcamDetections.length > 0 && (
            <div className="p-4 rounded-2xl bg-charcoal-950 border border-slate-800">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                Live Frame Detections ({webcamDetections.length} objects)
              </span>
              <div className="flex flex-wrap gap-2">
                {webcamDetections.map((d, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-lg text-xs font-semibold bg-eco-500/10 text-eco-400 border border-eco-500/30 flex items-center gap-1.5"
                  >
                    <span>{d.final_classification}</span>
                    <span className="text-[10px] text-slate-400">({Math.round(d.confidence_score * 100)}%)</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
