"""
EcoVision AI - Category Mapping and Recommendation Module
Maps fine-grained subtypes to the 8 standard waste categories and generates rule-based recommendations.
"""

from typing import Dict, List, Tuple
from app.schemas import WasteCategoryEnum, DisposalRecommendation

# Configurable mapping dictionary
SUBTYPE_TO_CATEGORY: Dict[str, WasteCategoryEnum] = {
    # Plastic
    "plastic bottle": WasteCategoryEnum.PLASTIC,
    "plastic packaging": WasteCategoryEnum.PLASTIC,
    "plastic container": WasteCategoryEnum.PLASTIC,
    "plastic cup": WasteCategoryEnum.PLASTIC,
    "plastic bag": WasteCategoryEnum.PLASTIC,
    "bottle": WasteCategoryEnum.PLASTIC,  # default when generic YOLO detection
    
    # Paper and cardboard
    "paper sheet": WasteCategoryEnum.PAPER_CARDBOARD,
    "cardboard": WasteCategoryEnum.PAPER_CARDBOARD,
    "paper": WasteCategoryEnum.PAPER_CARDBOARD,
    "cardboard box": WasteCategoryEnum.PAPER_CARDBOARD,
    "newspaper": WasteCategoryEnum.PAPER_CARDBOARD,
    
    # Metal
    "metal can": WasteCategoryEnum.METAL,
    "aluminum can": WasteCategoryEnum.METAL,
    "can": WasteCategoryEnum.METAL,
    "metal scrap": WasteCategoryEnum.METAL,
    "tin can": WasteCategoryEnum.METAL,
    
    # Glass
    "glass bottle": WasteCategoryEnum.GLASS,
    "glass jar": WasteCategoryEnum.GLASS,
    "wine bottle": WasteCategoryEnum.GLASS,
    
    # Organic waste
    "food scraps": WasteCategoryEnum.ORGANIC,
    "fruit peel": WasteCategoryEnum.ORGANIC,
    "vegetable scrap": WasteCategoryEnum.ORGANIC,
    "organic waste": WasteCategoryEnum.ORGANIC,
    
    # Electronic waste
    "electronic waste": WasteCategoryEnum.E_WASTE,
    "e-waste": WasteCategoryEnum.E_WASTE,
    "circuit board": WasteCategoryEnum.E_WASTE,
    "battery": WasteCategoryEnum.E_WASTE,
    "cell phone": WasteCategoryEnum.E_WASTE,
    
    # Other or mixed
    "other waste": WasteCategoryEnum.OTHER_MIXED,
    "mixed waste": WasteCategoryEnum.OTHER_MIXED,
    "cigarette butt": WasteCategoryEnum.OTHER_MIXED,
}

DISPOSAL_RULES_DATABASE: Dict[str, dict] = {
    "plastic bottle": {
        "disposal": "Recycle Bin (Rigid Plastic Stream - PET #1 / HDPE #2)",
        "preparation": [
            "Empty all liquids completely",
            "Rinse out sticky or dairy residues",
            "Crush bottle to save recycling container volume",
            "Re-attach the cap firmly if local facility accepts caps-on"
        ],
        "recyclable": True,
        "reason": "Clear PET bottles are mechanically shredded, washed, and pelletized into rPET for new bottles and textiles."
    },
    "plastic packaging": {
        "disposal": "Soft Plastics Drop-off or General Waste",
        "preparation": [
            "Perform scrunch test: if it scrunches into a ball and stays, look for store soft plastic collection",
            "Ensure free of food grease and organic crumbs",
            "Do NOT place in standard curbside rigid plastic bins unless certified locally"
        ],
        "recyclable": False,
        "reason": "Thin films wrap around spinning mechanical sorting trommels in MRF plants, causing facility shutdowns."
    },
    "paper sheet": {
        "disposal": "Paper & Fiber Curbside Bin",
        "preparation": [
            "Keep dry and completely free of oil, sauce, or water",
            "Remove large adhesive tapes or plastic binder sleeves",
            "Do not shred into tiny confetti if your MRF sorts by screen size"
        ],
        "recyclable": True,
        "reason": "Dry paper fibers are blended with water into pulp to produce recycled cardboard and newsprint."
    },
    "cardboard": {
        "disposal": "Cardboard Recycling Stream",
        "preparation": [
            "Flatten boxes completely before bin deposit",
            "Remove plastic air pillows, styrofoam inserts, and heavy packaging tape",
            "Keep protected from rain; wet cardboard fibers degrade quickly"
        ],
        "recyclable": True,
        "reason": "Corrugated cardboard has high circularity, conserving up to 90% water and energy over virgin wood pulp."
    },
    "metal can": {
        "disposal": "Metals & Cans Recycling Bin",
        "preparation": [
            "Empty completely and rinse cleanly",
            "Push metal lid down inside the can or leave attached to prevent cutting handlers",
            "No need to remove paper labels"
        ],
        "recyclable": True,
        "reason": "Aluminum and tinplate steel can be melted and reformed indefinitely with no loss of structural purity."
    },
    "glass bottle": {
        "disposal": "Dedicated Glass Drop-off or Curbside Glass Bin",
        "preparation": [
            "Empty and rinse residue",
            "Remove corks and metal bottlecaps (recycle metal caps separately)",
            "Do NOT mix with ceramics, Pyrex, window panes, or drinking glasses"
        ],
        "recyclable": True,
        "reason": "Container glass melts at lower kiln temperatures when recycled (cullet), slashing carbon emissions."
    },
    "food scraps": {
        "disposal": "Municipal Green Bin / Organics Composter / Bokashi",
        "preparation": [
            "Remove fruit brand stickers, plastic netting, twist-ties, and rubber bands",
            "Use certified BPI compostable bin liners or wrap in plain unprinted newsprint",
            "Keep meat and dairy out of home backyard compost unless using aerated digestion"
        ],
        "recyclable": False,
        "reason": "Landfilled organic matter decays without oxygen into potent greenhouse gas methane (CH4)."
    },
    "electronic waste": {
        "disposal": "Authorized E-Waste Collection Point / Electronics Retailer Drop-off",
        "preparation": [
            "Disconnect detachable lithium-ion batteries and tape terminals",
            "Perform factory wipe of confidential personal data on digital storage",
            "NEVER throw into household waste bins due to severe fire hazard from lithium batteries"
        ],
        "recyclable": True,
        "reason": "Contains critical raw minerals (copper, gold, lithium, cobalt) and hazardous heavy metals (lead, mercury)."
    },
    "other waste": {
        "disposal": "General Solid Waste (Landfill / Waste-to-Energy)",
        "preparation": [
            "Bag tightly to prevent windblown street litter",
            "Check if local specialized recycling exists (e.g. TerraCycle programs)"
        ],
        "recyclable": False,
        "reason": "Composite materials with bonded laminates cannot be cost-effectively separated by standard mechanical MRFs."
    }
}

def map_subtype_to_category(subtype: str, confidence: float = 1.0) -> WasteCategoryEnum:
    """Map detected subtype to one of the 8 canonical categories."""
    clean_key = subtype.strip().lower()
    if clean_key in SUBTYPE_TO_CATEGORY:
        return SUBTYPE_TO_CATEGORY[clean_key]
    
    # Keyword fallback
    if "plastic" in clean_key or "poly" in clean_key:
        return WasteCategoryEnum.PLASTIC
    elif "paper" in clean_key or "cardboard" in clean_key or "carton" in clean_key:
        return WasteCategoryEnum.PAPER_CARDBOARD
    elif "metal" in clean_key or "can" in clean_key or "aluminum" in clean_key or "tin" in clean_key:
        return WasteCategoryEnum.METAL
    elif "glass" in clean_key or "bottle" in clean_key:
        return WasteCategoryEnum.GLASS
    elif "food" in clean_key or "organic" in clean_key or "fruit" in clean_key or "vegetable" in clean_key:
        return WasteCategoryEnum.ORGANIC
    elif "electronic" in clean_key or "e-waste" in clean_key or "battery" in clean_key:
        return WasteCategoryEnum.E_WASTE
        
    return WasteCategoryEnum.OTHER_MIXED

def generate_disposal_recommendation(
    subtype: str,
    category: WasteCategoryEnum,
    confidence: float
) -> DisposalRecommendation:
    """Generate detailed, actionable disposal instructions tailored to item subtype."""
    clean_key = subtype.strip().lower()
    rule = DISPOSAL_RULES_DATABASE.get(clean_key)
    
    if not rule:
        # Fallback based on category
        for known_sub, known_rule in DISPOSAL_RULES_DATABASE.items():
            if SUBTYPE_TO_CATEGORY.get(known_sub) == category:
                rule = known_rule
                break
                
    if not rule:
        rule = DISPOSAL_RULES_DATABASE["other waste"]
        
    return DisposalRecommendation(
        detected_item=subtype.title(),
        waste_category=category,
        suggested_disposal=rule["disposal"],
        preparation_instructions=rule["preparation"],
        recycling_eligibility=rule["recyclable"],
        confidence_score=round(confidence, 3),
        reason=rule["reason"],
        local_rules_notice="Recycling infrastructure varies by county/municipality. Always consult your local municipality rules."
    )
