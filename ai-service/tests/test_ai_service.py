"""
EcoVision AI - Unit Tests for AI Service Components & Innovation Modules
"""

import pytest
from PIL import Image
import numpy as np

from app.schemas import WasteCategoryEnum, ReviewStatusEnum, ModelAgreementEnum
from app.models.category_mapper import map_subtype_to_category, generate_disposal_recommendation
from app.models.fusion_engine import (
    PredictionFusionEngine,
    assess_crop_contamination,
    calculate_segregation_readiness
)
from app.models.cnn_classifier import WasteCNNClassifier
from app.services.arduino_controller import ArduinoSmartSegregationController

def test_category_mapping():
    assert map_subtype_to_category("plastic bottle") == WasteCategoryEnum.PLASTIC
    assert map_subtype_to_category("cardboard") == WasteCategoryEnum.PAPER_CARDBOARD
    assert map_subtype_to_category("metal can") == WasteCategoryEnum.METAL
    assert map_subtype_to_category("glass bottle") == WasteCategoryEnum.GLASS
    assert map_subtype_to_category("food scraps") == WasteCategoryEnum.ORGANIC
    assert map_subtype_to_category("electronic waste") == WasteCategoryEnum.E_WASTE

def test_disposal_recommendations():
    rec = generate_disposal_recommendation("plastic bottle", WasteCategoryEnum.PLASTIC, 0.92)
    assert rec.recycling_eligibility is True
    assert "PET" in rec.suggested_disposal
    assert len(rec.preparation_instructions) > 0

    rec_food = generate_disposal_recommendation("food scraps", WasteCategoryEnum.ORGANIC, 0.88)
    assert rec_food.recycling_eligibility is False
    assert "Compost" in rec_food.suggested_disposal

def test_fusion_engine_agreement():
    fusion = PredictionFusionEngine(yolo_threshold=0.25, cnn_threshold=0.40)
    final_class, cat, status, agr, prio, conf, note = fusion._apply_fusion_strategy(
        yolo_label="cardboard",
        yolo_conf=0.88,
        cnn_subtype="cardboard",
        cnn_conf=0.90
    )
    assert status == ReviewStatusEnum.CONFIRMED
    assert cat == WasteCategoryEnum.PAPER_CARDBOARD
    assert agr == ModelAgreementEnum.FULL_AGREEMENT
    assert conf > 0.85

def test_fusion_engine_generic_refinement():
    fusion = PredictionFusionEngine(yolo_threshold=0.25, cnn_threshold=0.40)
    final_class, cat, status, agr, prio, conf, note = fusion._apply_fusion_strategy(
        yolo_label="bottle",
        yolo_conf=0.82,
        cnn_subtype="plastic bottle",
        cnn_conf=0.85
    )
    assert status == ReviewStatusEnum.CONFIRMED
    assert final_class == "plastic bottle"
    assert cat == WasteCategoryEnum.PLASTIC
    assert agr == ModelAgreementEnum.REFINEMENT

def test_fusion_engine_disagreement():
    fusion = PredictionFusionEngine(yolo_threshold=0.25, cnn_threshold=0.40)
    final_class, cat, status, agr, prio, conf, note = fusion._apply_fusion_strategy(
        yolo_label="metal can",
        yolo_conf=0.75,
        cnn_subtype="plastic packaging",
        cnn_conf=0.92
    )
    assert status == ReviewStatusEnum.DISPUTED
    assert agr == ModelAgreementEnum.DISPUTED
    assert note is not None
    assert "Disagreement" in note

def test_fusion_engine_low_confidence():
    fusion = PredictionFusionEngine(yolo_threshold=0.25, cnn_threshold=0.40)
    final_class, cat, status, agr, prio, conf, note = fusion._apply_fusion_strategy(
        yolo_label="plastic packaging",
        yolo_conf=0.18,  # Below 0.25 threshold
        cnn_subtype="plastic packaging",
        cnn_conf=0.30
    )
    assert status == ReviewStatusEnum.NEEDS_REVIEW
    assert cat == WasteCategoryEnum.UNKNOWN
    assert agr == ModelAgreementEnum.LOW_CONFIDENCE

def test_contamination_and_segregation_readiness():
    test_crop = Image.new("RGB", (64, 64), color=(200, 240, 255))
    assessment = assess_crop_contamination(test_crop, "plastic bottle")
    assert assessment.cleanliness_score > 70.0
    assert assessment.supported is True

    readiness = calculate_segregation_readiness(
        confidence=0.90,
        agreement=ModelAgreementEnum.FULL_AGREEMENT,
        cleanliness=assessment.cleanliness_score
    )
    assert readiness.score > 75.0
    assert readiness.rating in ["High", "Medium"]

def test_arduino_controller():
    controller = ArduinoSmartSegregationController(simulation_mode=True)
    
    # Normal confirmed plastic
    resp = controller.trigger_segregation(
        category=WasteCategoryEnum.PLASTIC,
        confidence=0.89,
        item_subtype="plastic bottle",
        force_simulation=True
    )
    assert resp.success is True
    assert resp.servo_angle == 30
    assert "Plastics" in resp.target_bin

    # Low confidence should not actuate
    low_resp = controller.trigger_segregation(
        category=WasteCategoryEnum.PLASTIC,
        confidence=0.35,
        item_subtype="plastic bottle"
    )
    assert low_resp.success is False
    assert low_resp.servo_angle == 0

    # Emergency stop test
    controller.emergency_stop()
    assert controller.emergency_stop_active is True
    estop_resp = controller.trigger_segregation(
        category=WasteCategoryEnum.PLASTIC,
        confidence=0.95,
        item_subtype="plastic bottle"
    )
    assert estop_resp.success is False
    assert "EMERGENCY STOP" in estop_resp.target_bin
    
    controller.reset_emergency_stop()
    assert controller.emergency_stop_active is False

def test_cnn_crop_probabilities():
    classifier = WasteCNNClassifier()
    img = Image.new("RGB", (100, 100), color=(200, 230, 255))
    pred = classifier.classify_crop(img, yolo_hint="bottle")
    assert "top_subtype" in pred
    assert "confidence" in pred
    assert "probabilities" in pred
    total_p = sum(pred["probabilities"].values())
    assert abs(total_p - 1.0) < 0.05
