# EcoVision AI — Architecture & Engineering Specification

## 1. System Architecture Overview

EcoVision AI employs a modern **hybrid full-stack decoupled architecture**:
- **Presentation Layer**: Next.js 14, React 18, Tailwind CSS, Lucide Icons, Recharts.
- **Application & Persistence Layer**: Node.js & Express.js REST API with Mongoose and MongoDB.
- **Inference & Deep Learning Layer**: Python 3.12, FastAPI, Ultralytics YOLOv8, and PyTorch WasteConvNet CNN.
- **Hardware Interface**: Dual-mode Arduino microcontroller controller (USB-Serial & High-Fidelity Simulation).

```
                      +---------------------------------------+
                      |       Next.js Frontend (React)        |
                      |  Detection Studio / Waste Analytics   |
                      +-------------------+-------------------+
                                          |
                                    HTTP / JSON
                                          v
                      +---------------------------------------+
                      |         Express Backend API           |
                      |   Auth (JWT) / History / Persistence  |
                      +---------+-------------------+---------+
                                |                   |
                      Mongoose Queries        HTTP / Form-Data
                                v                   v
                     +--------------------+  +--------------------+
                     |   MongoDB Atlas    |  |  FastAPI Inference |
                     |   or Local Store   |  |   Python Service   |
                     +--------------------+  +---------+----------+
                                                       |
                                        +--------------+--------------+
                                        |                             |
                                        v                             v
                              +--------------------+       +--------------------+
                              |  Ultralytics YOLO  |       |  PyTorch CNN Crop  |
                              |  Localization Box  |       |  Material Subtype  |
                              +---------+----------+       +----------+---------+
                                        |                             |
                                        +--------------+--------------+
                                                       |
                                                       v
                                            +--------------------+
                                            |  Prediction Fusion |
                                            |  & Disagreement    |
                                            +----------+---------+
                                                       |
                                                       v
                                            +--------------------+
                                            |  Arduino Servo     |
                                            |  Sorting Gate      |
                                            +--------------------+
```

---

## 2. Dual-Stage Computer Vision Strategy

### Stage 1: Input Preprocessing
- Accepts camera captures, video streams, or webcam frames.
- Re-scales image dimensions to $640 \times 640$ for YOLO anchor-free detection.
- Normalizes pixel tensors using ImageNet channel metrics: $\mu = [0.485, 0.456, 0.406]$, $\sigma = [0.229, 0.224, 0.225]$.

### Stage 2: YOLO Object Localization
- Identifies spatial bounding coordinates $[x_1, y_1, x_2, y_2]$.
- Extracts class confidence scores and coarse category tags.
- Capable of resolving multiple overlapping objects simultaneously in a single image.

### Stage 3: Fine-Grained CNN Crop Classifier
- Each detected bounding box is extracted as an independent image patch.
- The crop is resized to $224 \times 224$ and passed to `WasteConvNet`:
  - 4 convolutional feature blocks with $3\times3$ kernels, `BatchNorm2d`, and `ReLU`.
  - `AdaptiveAvgPool2d((4, 4))` to preserve spatial invariance regardless of crop aspect ratio.
  - Linear classifier with `Dropout(0.3)` outputting logits across 8 subtypes.
- Computes softmax probabilities over subtypes:
  1. Plastic bottle
  2. Plastic packaging
  3. Paper sheet
  4. Cardboard
  5. Metal can
  6. Glass bottle
  7. Food scraps
  8. Other waste

### Stage 4: Prediction Fusion & Conflict Resolution
The `PredictionFusionEngine` executes the following decision matrix:
1. **Low Confidence Filter**: If $\text{conf}_{\text{YOLO}} < 0.25$ or $\text{conf}_{\text{CNN}} < 0.40$, the item is classified as `Unknown or needs review` with `review_status = needs_review`.
2. **Generic Refinement**: When YOLO returns a broad object shape (e.g. `bottle`), the CNN texture classifier refines it to `Plastic bottle` or `Glass bottle` based on surface reflectance.
3. **Agreement Verification**: When YOLO and CNN agree on the material category, fused confidence is boosted:
   $$\text{Confidence}_{\text{fused}} = 0.45 \cdot \text{conf}_{\text{YOLO}} + 0.55 \cdot \text{conf}_{\text{CNN}}$$
4. **Disagreement Auditing**: If YOLO predicts `metal can` but CNN predicts `plastic packaging`, the disagreement is flagged with `review_status = disputed` and highlighted for user verification.

---

## 3. Database Schema Architecture

- **`User`**: Tracks name, email, bcrypt password hash, and authorization role (`user` vs `admin`).
- **`DetectionSession`**: Captures session timestamp, input mode (`image`, `video`, `webcam`), total objects, processing latency, and optional user link.
- **`Detection`**: High-resolution record containing YOLO bounding boxes, YOLO class, CNN subtype, probability distribution map, final fused category, review flag, and rule-based disposal recommendations.
- **`DisposalRule`**: Decoupled municipal rules specifying preparation instructions, recyclability eligibility, and circularity rationale.
- **`ModelEvaluation`**: Preserves verified benchmark evaluation logs (precision, recall, mAP, confusion matrices).
