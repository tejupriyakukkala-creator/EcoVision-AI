"""
EcoVision AI - Prediction Fusion & EcoGuard Uncertainty Engine
Fuses YOLO object detections with fine-grained CNN crop classifications,
evaluates optical surface contamination, assigns EcoTwin digital waste identities,
and calculates segregation-readiness scores.
"""

import uuid
import random
import logging
import numpy as np
from typing import List, Dict, Tuple, Optional
from PIL import Image

from app.schemas import (
    BoundingBox,
    FusedDetectionResult,
    WasteCategoryEnum,
    ReviewStatusEnum,
    LifecycleStatusEnum,
    ModelAgreementEnum,
    ReviewPriorityEnum,
    ContaminationAssessment,
    SegregationReadiness,
    DisposalRecommendation
)
from app.models.category_mapper import map_subtype_to_category, generate_disposal_recommendation

logger = logging.getLogger("ecovision.fusion")

def assess_crop_contamination(crop: Image.Image, subtype: str) -> ContaminationAssessment:
    """
    Evaluates visible surface contamination (residues, liquid, stains, crushed damage).
    Transparently notes optical assessment limits (does not certify chemical/biological safety).
    """
    try:
        crop_np = np.array(crop.resize((64, 64)), dtype=np.float32) / 255.0
        # Color variance & standard deviation
        color_std = float(crop_np.std())
        brightness = float(crop_np.mean())
        
        # Color saturation analysis
        r, g, b = crop_np[:, :, 0], crop_np[:, :, 1], crop_np[:, :, 2]
        saturation = np.max(crop_np, axis=2) - np.min(crop_np, axis=2)
        mean_sat = float(saturation.mean())

        has_residue = False
        residue_type = "none"
        cleanliness = 95.0

        # Heuristic rules on visible residue
        if "paper" in subtype or "cardboard" in subtype:
            # Greasy patches or liquid stains darken paper and increase saturation variance
            if mean_sat > 0.35 and color_std > 0.22 and brightness < 0.65:
                has_residue = True
                residue_type = "food"
                cleanliness = 58.0
        elif "bottle" in subtype or "can" in subtype:
            # Liquid or dirt accumulation
            if color_std > 0.28:
                has_residue = True
                residue_type = "liquid"
                cleanliness = 72.0
        elif "food" in subtype:
            has_residue = True
            residue_type = "food"
            cleanliness = 30.0

        note = "Optical surface assessment: clean container."
        if has_residue:
            note = f"Visible {residue_type} residue detected. Pre-rinsing or separate disposal recommended."

        return ContaminationAssessment(
            has_visible_residue=has_residue,
            residue_type=residue_type,
            cleanliness_score=round(cleanliness, 1),
            supported=True,
            note=note
        )
    except Exception as e:
        logger.warning(f"Contamination assessment note: {e}")
        return ContaminationAssessment(
            has_visible_residue=False,
            residue_type="none",
            cleanliness_score=85.0,
            supported=False,
            note="Contamination model fallback: default clean baseline."
        )

def calculate_segregation_readiness(
    confidence: float,
    agreement: ModelAgreementEnum,
    cleanliness: float
) -> SegregationReadiness:
    """
    Transparent readiness formula:
    Readiness = (Confidence * 40%) + (AgreementScore * 30%) + (Cleanliness * 30%)
    """
    agreement_score_map = {
        ModelAgreementEnum.FULL_AGREEMENT: 100.0,
        ModelAgreementEnum.REFINEMENT: 90.0,
        ModelAgreementEnum.DISPUTED: 40.0,
        ModelAgreementEnum.LOW_CONFIDENCE: 20.0
    }
    agr_score = agreement_score_map.get(agreement, 50.0)
    conf_score = min(100.0, confidence * 100.0)

    total_score = (conf_score * 0.40) + (agr_score * 0.30) + (cleanliness * 0.30)
    total_score = round(max(0.0, min(100.0, total_score)), 1)

    if total_score >= 80.0:
        rating = "High"
    elif total_score >= 60.0:
        rating = "Medium"
    elif total_score >= 40.0:
        rating = "Low"
    else:
        rating = "Requires Audit"

    return SegregationReadiness(
        score=total_score,
        factors={
            "confidenceFactor": round(conf_score * 0.40, 1),
            "agreementFactor": round(agr_score * 0.30, 1),
            "cleanlinessFactor": round(cleanliness * 0.30, 1)
        },
        rating=rating
    )

class PredictionFusionEngine:
    """
    Combines YOLO spatial bounding boxes & general object classes with
    CNN fine-grained material subtype predictions & class probabilities.
    Includes EcoGuard uncertainty detection and EcoTwin digital identities.
    """

    def __init__(
        self,
        yolo_threshold: float = 0.25,
        cnn_threshold: float = 0.40,
        high_confidence_threshold: float = 0.65
    ):
        self.yolo_threshold = yolo_threshold
        self.cnn_threshold = cnn_threshold
        self.high_confidence_threshold = high_confidence_threshold

    def fuse(
        self,
        image: Image.Image,
        yolo_detections: List[Dict],
        cnn_classifier
    ) -> List[FusedDetectionResult]:
        """
        Takes raw image, YOLO bounding boxes, and passes crops through CNN classifier.
        Fuses predictions, assesses contamination, and generates digital identity records.
        """
        img_w, img_h = image.size
        fused_results: List[FusedDetectionResult] = []

        for idx, yolo_det in enumerate(yolo_detections):
            box = yolo_det["box"]
            yolo_conf = float(yolo_det["confidence"])
            yolo_label = yolo_det["label"].lower().strip()

            # Clamp coordinates to image boundaries
            x1 = max(0, min(int(box["x1"]), img_w - 1))
            y1 = max(0, min(int(box["y1"]), img_h - 1))
            x2 = max(x1 + 1, min(int(box["x2"]), img_w))
            y2 = max(y1 + 1, min(int(box["y2"]), img_h))

            # Crop region for CNN classifier
            crop = image.crop((x1, y1, x2, y2))
            
            # Pass crop to CNN classifier with yolo hint for Bayesian prior
            cnn_pred = cnn_classifier.classify_crop(crop, yolo_hint=yolo_label)
            cnn_subtype = cnn_pred["top_subtype"]
            cnn_conf = float(cnn_pred["confidence"])
            cnn_probs = cnn_pred["probabilities"]

            # Contamination assessment
            contamination = assess_crop_contamination(crop, cnn_subtype)

            # Documented Decision Fusion Strategy
            final_class, waste_cat, status, agreement, priority, fused_conf, reason_note = self._apply_fusion_strategy(
                yolo_label=yolo_label,
                yolo_conf=yolo_conf,
                cnn_subtype=cnn_subtype,
                cnn_conf=cnn_conf
            )

            # Segregation Readiness Score
            readiness = calculate_segregation_readiness(
                confidence=fused_conf,
                agreement=agreement,
                cleanliness=contamination.cleanliness_score
            )

            # Generate rule-based disposal recommendations
            recommendation = generate_disposal_recommendation(
                subtype=final_class,
                category=waste_cat,
                confidence=fused_conf
            )
            
            if reason_note:
                recommendation.reason = f"{recommendation.reason} ({reason_note})"

            # If contaminated, prepend preparation note
            if contamination.has_visible_residue:
                recommendation.preparation_instructions.insert(
                    0, f"Attention: Visible {contamination.residue_type} residue detected. Rinse thoroughly before depositing."
                )

            # EcoTwin digital identity string (e.g. ECO-7491)
            record_id = f"ECO-{random.randint(1000, 9999)}"

            fused_results.append(FusedDetectionResult(
                id=f"det-{uuid.uuid4().hex[:8]}",
                record_id=record_id,
                bbox=BoundingBox(x1=float(x1), y1=float(y1), x2=float(x2), y2=float(y2)),
                yolo_label=yolo_label,
                yolo_confidence=round(yolo_conf, 3),
                cnn_subtype=cnn_subtype,
                cnn_confidence=round(cnn_conf, 3),
                cnn_probabilities=cnn_probs,
                final_classification=final_class,
                waste_category=waste_cat,
                review_status=status,
                lifecycle_status=LifecycleStatusEnum.NEEDS_REVIEW if status != ReviewStatusEnum.CONFIRMED else LifecycleStatusEnum.RECOMMENDATION_GENERATED,
                model_agreement=agreement,
                review_priority=priority,
                confidence_score=round(fused_conf, 3),
                contamination_assessment=contamination,
                segregation_readiness=readiness,
                disposal_recommendation=recommendation
            ))

        return fused_results

    def _apply_fusion_strategy(
        self,
        yolo_label: str,
        yolo_conf: float,
        cnn_subtype: str,
        cnn_conf: float
    ) -> Tuple[str, WasteCategoryEnum, ReviewStatusEnum, ModelAgreementEnum, ReviewPriorityEnum, float, Optional[str]]:
        """
        Decision Matrix:
        1. Low confidence -> Unknown / Needs Review
        2. Complementary refinement -> CNN refines generic YOLO class (e.g., bottle -> plastic bottle)
        3. Agreement -> Strong verification, boosted confidence
        4. Disagreement -> Flagged as 'disputed', enters EcoGuard review queue
        """
        yolo_category = map_subtype_to_category(yolo_label, yolo_conf)
        cnn_category = map_subtype_to_category(cnn_subtype, cnn_conf)

        # 1. Low Confidence Condition
        if yolo_conf < self.yolo_threshold or cnn_conf < self.cnn_threshold:
            return (
                "unverified waste item",
                WasteCategoryEnum.UNKNOWN,
                ReviewStatusEnum.NEEDS_REVIEW,
                ModelAgreementEnum.LOW_CONFIDENCE,
                ReviewPriorityEnum.HIGH,
                min(yolo_conf, cnn_conf),
                f"Low confidence warning: YOLO ({yolo_conf:.2f}), CNN ({cnn_conf:.2f})"
            )

        # 2. Refinement: YOLO detected generic object and CNN specialized the material
        if yolo_label in ["bottle", "cup", "can", "box", "waste item", "bowl"] and cnn_subtype != yolo_label:
            fused_conf = (0.35 * yolo_conf) + (0.65 * cnn_conf)
            return (
                cnn_subtype,
                cnn_category,
                ReviewStatusEnum.CONFIRMED,
                ModelAgreementEnum.REFINEMENT,
                ReviewPriorityEnum.LOW,
                fused_conf,
                f"Generic object '{yolo_label}' refined by CNN to specific material '{cnn_subtype}'"
            )

        # 3. Agreement or Compatible Material Category
        if yolo_category == cnn_category:
            fused_conf = (0.45 * yolo_conf) + (0.55 * cnn_conf)
            return (
                cnn_subtype,
                cnn_category,
                ReviewStatusEnum.CONFIRMED,
                ModelAgreementEnum.FULL_AGREEMENT,
                ReviewPriorityEnum.NONE,
                fused_conf,
                "YOLO detection verified and refined by CNN material classification"
            )

        # 4. Disagreement between YOLO and CNN
        if yolo_category != cnn_category:
            if cnn_conf > yolo_conf + 0.15:
                fused_conf = cnn_conf * 0.85
                return (
                    cnn_subtype,
                    cnn_category,
                    ReviewStatusEnum.DISPUTED,
                    ModelAgreementEnum.DISPUTED,
                    ReviewPriorityEnum.MEDIUM,
                    fused_conf,
                    f"Disagreement flagged: YOLO identified '{yolo_label}', but CNN texture analysis predicted '{cnn_subtype}'"
                )
            elif yolo_conf > cnn_conf + 0.15:
                fused_conf = yolo_conf * 0.85
                return (
                    yolo_label,
                    yolo_category,
                    ReviewStatusEnum.DISPUTED,
                    ModelAgreementEnum.DISPUTED,
                    ReviewPriorityEnum.MEDIUM,
                    fused_conf,
                    f"Disagreement flagged: YOLO shape geometry prefers '{yolo_label}' over CNN '{cnn_subtype}'"
                )
            else:
                fused_conf = (yolo_conf + cnn_conf) / 2.0
                return (
                    f"{yolo_label} / {cnn_subtype}",
                    WasteCategoryEnum.UNKNOWN,
                    ReviewStatusEnum.NEEDS_REVIEW,
                    ModelAgreementEnum.DISPUTED,
                    ReviewPriorityEnum.HIGH,
                    fused_conf,
                    f"Conflicting predictions between YOLO ({yolo_label}) and CNN ({cnn_subtype}). Manual verification suggested."
                )

        fused_conf = (yolo_conf + cnn_conf) / 2.0
        return (
            cnn_subtype,
            cnn_category,
            ReviewStatusEnum.CONFIRMED,
            ModelAgreementEnum.FULL_AGREEMENT,
            ReviewPriorityEnum.NONE,
            fused_conf,
            None
        )
