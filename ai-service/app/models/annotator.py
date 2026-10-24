"""
EcoVision AI - Image and Video Frame Annotator
Draws clean, professional bounding boxes, labels, confidence scores, and review badges.
"""

import io
import base64
from typing import List, Tuple
import numpy as np
from PIL import Image, ImageDraw, ImageFont

from app.schemas import FusedDetectionResult, WasteCategoryEnum

# Distinct RGB color definitions for annotations
CATEGORY_RGB_COLORS = {
    WasteCategoryEnum.PLASTIC: (245, 158, 11),        # Amber
    WasteCategoryEnum.PAPER_CARDBOARD: (59, 130, 246), # Blue
    WasteCategoryEnum.METAL: (6, 182, 212),           # Cyan
    WasteCategoryEnum.GLASS: (16, 185, 129),          # Emerald Green
    WasteCategoryEnum.ORGANIC: (132, 204, 22),        # Lime
    WasteCategoryEnum.E_WASTE: (168, 85, 247),        # Purple
    WasteCategoryEnum.OTHER_MIXED: (100, 116, 139),   # Slate
    WasteCategoryEnum.UNKNOWN: (244, 63, 94),         # Rose
}

def annotate_image(
    image: Image.Image,
    detections: List[FusedDetectionResult]
) -> Tuple[Image.Image, str]:
    """
    Annotates the PIL image with colored bounding boxes, category badges, and confidence tags.
    Returns:
        (annotated_pil_image, base64_jpeg_string)
    """
    # Create a copy so original image remains untouched
    annotated = image.copy().convert("RGB")
    draw = ImageDraw.Draw(annotated)
    
    font = None
    try:
        # Try loading system font, fallback to default
        font = ImageFont.truetype("arial.ttf", size=max(14, int(image.width * 0.018)))
    except Exception:
        font = ImageFont.load_default()

    for det in detections:
        box = det.bbox
        cat = det.waste_category
        color = CATEGORY_RGB_COLORS.get(cat, (200, 200, 200))
        
        # Draw bounding box rectangle
        x1, y1, x2, y2 = box.x1, box.y1, box.x2, box.y2
        line_w = max(3, int(min(image.width, image.height) * 0.004))
        
        draw.rectangle([x1, y1, x2, y2], outline=color, width=line_w)
        
        # Label text
        label_text = f"{det.final_classification.title()} | {cat.value} ({int(det.confidence_score * 100)}%)"
        if det.review_status.value == "needs_review":
            label_text += " [REVIEW]"
        elif det.review_status.value == "disputed":
            label_text += " [DISPUTED]"

        # Calculate text bounding box
        bbox_text = draw.textbbox((x1, y1), label_text, font=font)
        text_w = bbox_text[2] - bbox_text[0]
        text_h = bbox_text[3] - bbox_text[1]
        
        # Header banner rectangle
        banner_y1 = max(0, y1 - text_h - 8)
        banner_y2 = y1
        draw.rectangle([x1, banner_y1, x1 + text_w + 12, banner_y2], fill=color)
        
        # Text in contrasting white or black
        text_color = (0, 0, 0) if cat in [WasteCategoryEnum.ORGANIC, WasteCategoryEnum.PLASTIC] else (255, 255, 255)
        draw.text((x1 + 6, banner_y1 + 4), label_text, fill=text_color, font=font)

    # Convert to base64 JPEG
    buffered = io.BytesIO()
    annotated.save(buffered, format="JPEG", quality=88)
    img_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
    
    return annotated, f"data:image/jpeg;base64,{img_b64}"

Tuple_Annotated = tuple[Image.Image, str]
