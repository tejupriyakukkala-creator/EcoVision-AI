from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from enum import Enum

class WasteCategoryEnum(str, Enum):
    PLASTIC = "Plastic"
    PAPER_CARDBOARD = "Paper and cardboard"
    METAL = "Metal"
    GLASS = "Glass"
    ORGANIC = "Organic waste"
    E_WASTE = "Electronic waste"
    OTHER_MIXED = "Other or mixed waste"
    UNKNOWN = "Unknown or needs review"

class ReviewStatusEnum(str, Enum):
    CONFIRMED = "confirmed"
    NEEDS_REVIEW = "needs_review"
    DISPUTED = "disputed"
    UNVERIFIED = "unverified"

class LifecycleStatusEnum(str, Enum):
    DETECTED = "detected"
    CLASSIFIED = "classified"
    NEEDS_REVIEW = "needs_review"
    RECOMMENDATION_GENERATED = "recommendation_generated"
    ACTION_CONFIRMED = "action_confirmed"
    CLOSED = "closed"

class ModelAgreementEnum(str, Enum):
    FULL_AGREEMENT = "full_agreement"
    REFINEMENT = "refinement"
    DISPUTED = "disputed"
    LOW_CONFIDENCE = "low_confidence"

class ReviewPriorityEnum(str, Enum):
    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class BoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float

class YoloDetectionResult(BaseModel):
    box: BoundingBox
    confidence: float
    class_id: int
    label: str

class CnnPredictionResult(BaseModel):
    top_subtype: str
    confidence: float
    probabilities: Dict[str, float]

class ContaminationAssessment(BaseModel):
    has_visible_residue: bool
    residue_type: Optional[str] = "none"
    cleanliness_score: float = 100.0  # 0.0 to 100.0
    supported: bool = True
    note: str = "Optical surface cleanliness assessment (not a chemical certificate)."

class SegregationReadiness(BaseModel):
    score: float = 90.0  # 0 to 100
    factors: Dict[str, float] = Field(default_factory=dict)
    rating: str = "High"

class DisposalRecommendation(BaseModel):
    detected_item: str
    waste_category: WasteCategoryEnum
    suggested_disposal: str
    preparation_instructions: List[str]
    recycling_eligibility: bool
    confidence_score: float
    reason: str
    local_rules_notice: str = "Always verify with municipal guidelines as municipal sorting streams vary."
    bin_type: Optional[str] = "Recycling"
    bin_color: Optional[str] = "#10b981"
    applicable_region: Optional[str] = "Global MRF Standards"
    rule_source: Optional[str] = "Municipal Circular Economy Standard 2026"

class FusedDetectionResult(BaseModel):
    id: str
    record_id: Optional[str] = None  # EcoTwin Digital Waste Identity (e.g. ECO-8921)
    bbox: BoundingBox
    yolo_label: str
    yolo_confidence: float
    cnn_subtype: str
    cnn_confidence: float
    cnn_probabilities: Dict[str, float]
    final_classification: str
    waste_category: WasteCategoryEnum
    review_status: ReviewStatusEnum
    lifecycle_status: LifecycleStatusEnum = LifecycleStatusEnum.RECOMMENDATION_GENERATED
    model_agreement: ModelAgreementEnum = ModelAgreementEnum.FULL_AGREEMENT
    review_priority: ReviewPriorityEnum = ReviewPriorityEnum.NONE
    confidence_score: float
    contamination_assessment: ContaminationAssessment
    segregation_readiness: SegregationReadiness
    disposal_recommendation: DisposalRecommendation

class ImagePredictResponse(BaseModel):
    total_objects: int
    detections: List[FusedDetectionResult]
    category_distribution: Dict[str, int]
    processing_time_ms: float
    annotated_image_base64: Optional[str] = None
    yolo_model_name: str
    cnn_model_name: str

class VideoFramePredictResponse(BaseModel):
    frame_index: int
    timestamp_ms: float
    total_objects: int
    detections: List[FusedDetectionResult]
    processing_time_ms: float
    annotated_frame_base64: Optional[str] = None

class VideoPredictResponse(BaseModel):
    total_frames_analyzed: int
    sampled_frame_interval: int
    unique_items_estimated: int
    category_distribution: Dict[str, int]
    detections_summary: List[Dict[str, Any]]
    representative_frames_base64: List[str]
    processing_time_ms: float

class ModelStatusResponse(BaseModel):
    service_status: str
    yolo_loaded: bool
    yolo_model_version: str
    cnn_loaded: bool
    cnn_architecture: str
    device: str
    confidence_thresholds: Dict[str, float]
    supported_subtypes: List[str]
    supported_categories: List[str]
    contamination_model_supported: bool = True
    active_innovations: List[str] = ["EcoTwin", "EcoGuard", "EcoRoute", "EcoPulse", "EcoLoop"]

class ArduinoTriggerRequest(BaseModel):
    waste_category: WasteCategoryEnum
    item_subtype: str
    confidence: float
    simulation: bool = True

class ArduinoTriggerResponse(BaseModel):
    success: bool
    target_bin: str
    servo_angle: int
    executed_mode: str
    message: str
