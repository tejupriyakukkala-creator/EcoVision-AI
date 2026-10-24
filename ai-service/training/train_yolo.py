"""
EcoVision AI - YOLO Object Detection Training Pipeline
Trains Ultralytics YOLO on waste detection datasets and reports mAP50, mAP50-95, precision, and recall.
"""

import os
import yaml
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ecovision.train_yolo")

def create_dataset_yaml(output_path: str = "ai-service/datasets/waste_data.yaml") -> str:
    """Creates standard Ultralytics YOLO dataset configuration file."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    config = {
        "path": os.path.abspath("ai-service/datasets"),
        "train": "images/train",
        "val": "images/val",
        "test": "images/test",
        "names": {
            0: "plastic bottle",
            1: "plastic packaging",
            2: "paper sheet",
            3: "cardboard",
            4: "metal can",
            5: "glass bottle",
            6: "food scraps",
            7: "electronic waste",
            8: "other waste"
        }
    }
    with open(output_path, "w") as f:
        yaml.dump(config, f, default_flow_style=False)
    return output_path

def train_yolo(
    data_yaml: str = "ai-service/datasets/waste_data.yaml",
    epochs: int = 5,
    imgsz: int = 640,
    batch: int = 8,
    model_name: str = "yolov8n.pt",
    output_weight_dest: str = "models/weights/ecovision_yolov8n.pt"
):
    """
    Executes Ultralytics YOLO training loop.
    """
    from ultralytics import YOLO

    logger.info("Initializing Ultralytics YOLO Training Pipeline...")
    model = YOLO(model_name)

    if not os.path.exists(data_yaml):
        data_yaml = create_dataset_yaml(data_yaml)

    logger.info(f"Using dataset configuration from: {data_yaml}")
    logger.info(f"Beginning training for {epochs} epochs at image size {imgsz}...")

    # Training call
    results = model.train(
        data=data_yaml,
        epochs=epochs,
        imgsz=imgsz,
        batch=batch,
        project="runs/detect",
        name="ecovision_train",
        exist_ok=True
    )

    # Validation & Metric Extraction
    logger.info("Evaluating trained YOLO model on validation split...")
    metrics = model.val()
    
    mp = float(metrics.box.mp)      # Mean precision
    mr = float(metrics.box.mr)      # Mean recall
    map50 = float(metrics.box.map50) # mAP @ 0.50 IoU
    map = float(metrics.box.map)     # mAP @ 0.50-0.95 IoU

    logger.info(f"YOLO Validation Results:")
    logger.info(f" - Precision: {mp:.4f}")
    logger.info(f" - Recall:    {mr:.4f}")
    logger.info(f" - mAP@50:    {map50:.4f}")
    logger.info(f" - mAP@50-95: {map:.4f}")

    best_weights = os.path.join("runs", "detect", "ecovision_train", "weights", "best.pt")
    if os.path.exists(best_weights):
        os.makedirs(os.path.dirname(output_weight_dest), exist_ok=True)
        import shutil
        shutil.copyfile(best_weights, output_weight_dest)
        logger.info(f"Copied optimal weights to {output_weight_dest}")

    return {
        "precision": round(mp, 4),
        "recall": round(mr, 4),
        "map50": round(map50, 4),
        "map50_95": round(map, 4)
    }

if __name__ == "__main__":
    train_yolo(epochs=1)
