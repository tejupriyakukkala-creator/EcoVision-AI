# EcoVision AI — Dataset Setup & Training Guide

This guide describes how to configure, download, and structure datasets for training both the **YOLO object detector** and the **PyTorch CNN fine-grained classifier**.

---

## 1. Supported Benchmark Datasets

EcoVision AI is designed around two widely recognized open-source waste datasets:

### A. TACO (Trash Annotations in Context)
- **Source**: [https://github.com/pedropro/TACO](https://github.com/pedropro/TACO)
- **License**: Creative Commons Attribution 4.0 International (CC BY 4.0).
- **Format**: MS COCO JSON annotations of litter in diverse natural and urban backgrounds.
- **Use**: Ideal for training the Stage 2 YOLO object localization model.

### B. WasteNet / TrashNet
- **Source**: Gary Thung, Mindy Yang ([https://github.com/garythung/trashnet](https://github.com/garythung/trashnet))
- **Categories**: Glass, Paper, Cardboard, Plastic, Metal, Trash.
- **Use**: Ideal for fine-tuning the Stage 3 CNN classifier on cropped object images.

---

## 2. Directory Layout

Place dataset files under `ai-service/datasets/` in the following structure:

```
ai-service/
  datasets/
    images/
      train/          # YOLO training images (.jpg, .png)
      val/            # YOLO validation images
      test/           # YOLO testing images
    labels/
      train/          # YOLO label files (.txt) in normalized format
      val/            # YOLO validation labels
      test/           # YOLO test labels
    waste_crops/
      train/
        plastic_bottle/
        plastic_packaging/
        paper_sheet/
        cardboard/
        metal_can/
        glass_bottle/
        food_scraps/
        other_waste/
      val/
        ...
```

### YOLO Label Format
Each line in `<image_name>.txt` specifies:
`<class_id> <x_center> <y_center> <width> <height>`
(Coordinates normalized from $0.0$ to $1.0$).

---

## 3. Training Execution

### Training YOLO Detector
Run the provided training script:
```powershell
cd ai-service
.\venv\Scripts\python training\train_yolo.py
```
This trains the model, records mAP@50 and mAP@50-95, and copies the best checkpoint to `models/weights/ecovision_yolov8n.pt`.

### Training the CNN Classifier
Run the PyTorch CNN training script:
```powershell
cd ai-service
.\venv\Scripts\python training\train_cnn.py
```
This trains `WasteConvNet`, validates on the holdout split, generates the confusion matrix, and saves weights to `models/weights/waste_cnn_resnet18.pth`.

### Running Full Pipeline Evaluation
```powershell
cd ai-service
.\venv\Scripts\python training\evaluate.py
```
Outputs `evaluation_report.json` with precision, recall, accuracy, and macro-F1.
