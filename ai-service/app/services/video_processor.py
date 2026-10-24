"""
EcoVision AI - Video Processing & Multi-Frame Deduplication Service
Processes video streams, samples frames at intervals, tracks objects across frames
using spatial IoU to avoid double-counting, and extracts representative annotated keyframes.
"""

import os
import cv2
import time
import logging
from typing import List, Dict, Any, Tuple
from PIL import Image
import numpy as np

from app.models.annotator import annotate_image
from app.schemas import VideoPredictResponse, WasteCategoryEnum

logger = logging.getLogger("ecovision.video")

def compute_iou(boxA: Dict[str, float], boxB: Dict[str, float]) -> float:
    """Compute Intersection over Union (IoU) between two bounding boxes."""
    xA = max(boxA["x1"], boxB["x1"])
    yA = max(boxA["y1"], boxB["y1"])
    xB = min(boxA["x2"], boxB["x2"])
    yB = min(boxA["y2"], boxB["y2"])

    interArea = max(0, xB - xA) * max(0, yB - yA)
    boxAArea = max(1e-5, (boxA["x2"] - boxA["x1"]) * (boxA["y2"] - boxA["y1"]))
    boxBArea = max(1e-5, (boxB["x2"] - boxB["x1"]) * (boxB["y2"] - boxB["y1"]))

    iou = interArea / float(boxAArea + boxBArea - interArea)
    return max(0.0, min(1.0, iou))

class VideoProcessor:
    """Processes video files, samples frames, and deduplicates tracked items."""

    def __init__(self, yolo_detector, cnn_classifier, fusion_engine):
        self.yolo = yolo_detector
        self.cnn = cnn_classifier
        self.fusion = fusion_engine

    def process_video(
        self,
        video_path: str,
        sample_interval: int = 15,
        max_frames: int = 120
    ) -> VideoPredictResponse:
        """
        Processes video frames at specified intervals, tracking physical items to prevent double-counting.
        """
        start_time = time.time()
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            raise ValueError(f"Unable to open video file at {video_path}")

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = max(1.0, cap.get(cv2.CAP_PROP_FPS))
        
        frame_idx = 0
        analyzed_frames = 0
        
        # Tracked physical objects: {track_id: {"category": ..., "subtype": ..., "box": ..., "last_seen_frame": ..., "occurrences": ...}}
        tracked_objects: Dict[str, Dict[str, Any]] = {}
        next_track_id = 1
        
        representative_frames: List[str] = []
        frame_detections_history: List[Dict[str, Any]] = []

        while cap.isOpened() and analyzed_frames < max_frames:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % sample_interval == 0:
                analyzed_frames += 1
                
                # Convert BGR to RGB PIL
                img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                pil_image = Image.fromarray(img_rgb)
                
                # Run YOLO + CNN Fusion on sampled frame
                yolo_dets = self.yolo.detect(pil_image)
                fused = self.fusion.fuse(pil_image, yolo_dets, self.cnn)
                
                # Annotate representative frames
                if len(fused) > 0 and len(representative_frames) < 5:
                    _, b64 = annotate_image(pil_image, fused)
                    representative_frames.append(b64)

                # Match detections with currently active tracks to prevent double-counting
                for det in fused:
                    det_box = {
                        "x1": det.bbox.x1,
                        "y1": det.bbox.y1,
                        "x2": det.bbox.x2,
                        "y2": det.bbox.y2
                    }
                    
                    matched_id = None
                    best_iou = 0.35  # Minimum IoU threshold to consider it the same object
                    
                    for tid, t_data in tracked_objects.items():
                        # Only match if same or compatible category and seen recently (within 45 frames)
                        if (frame_idx - t_data["last_seen_frame"]) <= (sample_interval * 3):
                            iou = compute_iou(det_box, t_data["box"])
                            if iou > best_iou:
                                best_iou = iou
                                matched_id = tid

                    if matched_id:
                        # Update existing physical item
                        tracked_objects[matched_id]["box"] = det_box
                        tracked_objects[matched_id]["last_seen_frame"] = frame_idx
                        tracked_objects[matched_id]["occurrences"] += 1
                        tracked_objects[matched_id]["confidences"].append(det.confidence_score)
                    else:
                        # Register new unique physical object
                        tid = f"item_{next_track_id}"
                        next_track_id += 1
                        tracked_objects[tid] = {
                            "id": tid,
                            "category": det.waste_category.value,
                            "subtype": det.final_classification,
                            "box": det_box,
                            "first_seen_frame": frame_idx,
                            "last_seen_frame": frame_idx,
                            "occurrences": 1,
                            "confidences": [det.confidence_score],
                            "recommendation": det.disposal_recommendation.dict()
                        }

                frame_detections_history.append({
                    "frame_index": frame_idx,
                    "timestamp_sec": round(frame_idx / fps, 2),
                    "items_in_frame": len(fused)
                })

            frame_idx += 1

        cap.release()
        
        # Calculate category distribution among UNIQUE physical items
        category_dist: Dict[str, int] = {cat.value: 0 for cat in WasteCategoryEnum}
        unique_summary = []
        
        for tid, obj in tracked_objects.items():
            cat = obj["category"]
            category_dist[cat] = category_dist.get(cat, 0) + 1
            avg_conf = float(np.mean(obj["confidences"]))
            unique_summary.append({
                "item_id": tid,
                "waste_category": cat,
                "subtype": obj["subtype"],
                "occurrences_in_video": obj["occurrences"],
                "average_confidence": round(avg_conf, 3),
                "recommendation": obj["recommendation"]
            })

        processing_time = round((time.time() - start_time) * 1000, 2)

        return VideoPredictResponse(
            total_frames_analyzed=analyzed_frames,
            sampled_frame_interval=sample_interval,
            unique_items_estimated=len(tracked_objects),
            category_distribution=category_dist,
            detections_summary=unique_summary,
            representative_frames_base64=representative_frames,
            processing_time_ms=processing_time
        )
