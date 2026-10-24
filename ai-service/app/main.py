"""
EcoVision AI - FastAPI Model Inference Service
Exposes REST endpoints for real-time image, webcam frame, and video waste detection.
"""

import time
import io
import os
import logging
from typing import List
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image

from app.config import settings
from app.schemas import (
    ImagePredictResponse,
    VideoFramePredictResponse,
    VideoPredictResponse,
    ModelStatusResponse,
    ArduinoTriggerRequest,
    ArduinoTriggerResponse,
    WasteCategoryEnum
)
from app.models.yolo_detector import YOLODetector
from app.models.cnn_classifier import WasteCNNClassifier, SUBTYPES
from app.models.fusion_engine import PredictionFusionEngine
from app.models.annotator import annotate_image
from app.models.category_mapper import SUBTYPE_TO_CATEGORY
from app.services.video_processor import VideoProcessor
from app.services.arduino_controller import ArduinoSmartSegregationController

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ecovision.main")

# Global instances
yolo_detector = None
cnn_classifier = None
fusion_engine = None
video_processor = None
arduino_controller = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global yolo_detector, cnn_classifier, fusion_engine, video_processor, arduino_controller
    logger.info("Initializing EcoVision AI Inference Service...")
    
    yolo_detector = YOLODetector(
        model_path=settings.YOLO_MODEL_PATH,
        conf_threshold=settings.YOLO_CONF_THRESHOLD
    )
    
    cnn_classifier = WasteCNNClassifier(
        model_path=settings.CNN_MODEL_PATH,
        device=settings.DEVICE
    )
    
    fusion_engine = PredictionFusionEngine(
        yolo_threshold=settings.YOLO_CONF_THRESHOLD,
        cnn_threshold=settings.CNN_CONF_THRESHOLD,
        high_confidence_threshold=settings.FUSION_HIGH_CONF_THRESHOLD
    )
    
    video_processor = VideoProcessor(
        yolo_detector=yolo_detector,
        cnn_classifier=cnn_classifier,
        fusion_engine=fusion_engine
    )
    
    arduino_controller = ArduinoSmartSegregationController(
        port=settings.ARDUINO_PORT,
        baudrate=settings.ARDUINO_BAUDRATE,
        simulation_mode=settings.ARDUINO_SIMULATION_MODE
    )
    
    logger.info("EcoVision AI models and processors initialized successfully.")
    yield
    logger.info("EcoVision AI service shutting down.")

app = FastAPI(
    title=settings.APP_NAME,
    description="Hybrid YOLO + CNN intelligent waste detection and segregation recommendation API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "timestamp": time.time(),
        "device": settings.DEVICE
    }

@app.get("/models/status", response_model=ModelStatusResponse)
def get_model_status():
    global yolo_detector, cnn_classifier
    return ModelStatusResponse(
        service_status="ready" if yolo_detector and cnn_classifier else "initializing",
        yolo_loaded=yolo_detector is not None,
        yolo_model_version=yolo_detector.model_version if yolo_detector else "None",
        cnn_loaded=cnn_classifier is not None,
        cnn_architecture="WasteConvNet-PyTorch" if cnn_classifier else "None",
        device=settings.DEVICE,
        confidence_thresholds={
            "yolo_conf": settings.YOLO_CONF_THRESHOLD,
            "cnn_conf": settings.CNN_CONF_THRESHOLD,
            "fusion_conf": settings.FUSION_HIGH_CONF_THRESHOLD
        },
        supported_subtypes=SUBTYPES,
        supported_categories=[c.value for c in WasteCategoryEnum]
    )

@app.post("/predict/image", response_model=ImagePredictResponse)
async def predict_image(
    file: UploadFile = File(...),
    confidence_threshold: float = Query(0.25, ge=0.05, le=0.95)
):
    """
    Accepts an image, runs YOLO for object detection, crops detected objects,
    passes crops to CNN classifier, fuses results, and generates disposal recommendations.
    """
    start_time = time.time()
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload an image.")

    try:
        contents = await file.read()
        pil_image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to decode image: {str(e)}")

    # Stage 2: YOLO Object Detection
    yolo_detector.conf_threshold = confidence_threshold
    yolo_detections = yolo_detector.detect(pil_image)

    # Stage 3, 4, 5: CNN Classification, Prediction Fusion, and Category Mapping
    fused_detections = fusion_engine.fuse(pil_image, yolo_detections, cnn_classifier)

    # Annotate image
    _, annotated_b64 = annotate_image(pil_image, fused_detections)

    # Calculate category counts
    cat_counts = {c.value: 0 for c in WasteCategoryEnum}
    for det in fused_detections:
        cat_counts[det.waste_category.value] += 1

    processing_time = round((time.time() - start_time) * 1000, 2)

    return ImagePredictResponse(
        total_objects=len(fused_detections),
        detections=fused_detections,
        category_distribution=cat_counts,
        processing_time_ms=processing_time,
        annotated_image_base64=annotated_b64,
        yolo_model_name=yolo_detector.model_version,
        cnn_model_name="WasteConvNet-PyTorch"
    )

@app.post("/predict/video-frame", response_model=VideoFramePredictResponse)
async def predict_video_frame(
    file: UploadFile = File(...),
    frame_index: int = Form(0),
    timestamp_ms: float = Form(0.0),
    confidence_threshold: float = Form(0.25)
):
    """
    Real-time endpoint for webcam or streaming video frame processing.
    """
    start_time = time.time()
    try:
        contents = await file.read()
        pil_image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid frame: {str(e)}")

    yolo_detector.conf_threshold = confidence_threshold
    yolo_detections = yolo_detector.detect(pil_image)
    fused_detections = fusion_engine.fuse(pil_image, yolo_detections, cnn_classifier)
    _, annotated_b64 = annotate_image(pil_image, fused_detections)

    processing_time = round((time.time() - start_time) * 1000, 2)

    return VideoFramePredictResponse(
        frame_index=frame_index,
        timestamp_ms=timestamp_ms,
        total_objects=len(fused_detections),
        detections=fused_detections,
        processing_time_ms=processing_time,
        annotated_frame_base64=annotated_b64
    )

@app.post("/predict/video", response_model=VideoPredictResponse)
async def predict_video(
    file: UploadFile = File(...),
    sample_interval: int = Query(15, ge=1, le=100),
    max_frames: int = Query(120, ge=10, le=500)
):
    """
    Processes an uploaded video file, samples frames, aggregates detections without double-counting,
    and returns representative keyframes and overall statistics.
    """
    if not (file.content_type.startswith("video/") or file.filename.endswith((".mp4", ".avi", ".mov", ".webm"))):
        raise HTTPException(status_code=400, detail="Uploaded file must be a video.")

    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    temp_path = os.path.join(temp_dir, f"video_{int(time.time())}_{file.filename}")

    try:
        with open(temp_path, "wb") as f:
            f.write(await file.read())

        result = video_processor.process_video(
            video_path=temp_path,
            sample_interval=sample_interval,
            max_frames=max_frames
        )
        return result
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass

@app.post("/predict/batch")
async def predict_batch(files: List[UploadFile] = File(...)):
    """Batch prediction on multiple images."""
    results = []
    for f in files:
        contents = await f.read()
        pil_img = Image.open(io.BytesIO(contents)).convert("RGB")
        yolo_dets = yolo_detector.detect(pil_img)
        fused = fusion_engine.fuse(pil_img, yolo_dets, cnn_classifier)
        results.append({
            "filename": f.filename,
            "total_objects": len(fused),
            "detections": [d.dict() for d in fused]
        })
    return {"batch_size": len(files), "results": results}

@app.post("/arduino/trigger", response_model=ArduinoTriggerResponse)
def trigger_arduino(req: ArduinoTriggerRequest):
    """Controls the smart segregation sorting gate (servo motor or simulator)."""
    return arduino_controller.trigger_segregation(
        category=req.waste_category,
        confidence=req.confidence,
        item_subtype=req.item_subtype,
        force_simulation=req.simulation
    )

@app.post("/arduino/estop")
def arduino_estop():
    return arduino_controller.emergency_stop()

@app.post("/arduino/reset")
def arduino_reset():
    return arduino_controller.reset_emergency_stop()
