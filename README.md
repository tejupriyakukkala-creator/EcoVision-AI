# EcoVision AI — Intelligent Waste Detection & Smart Segregation
### Complete Full-Stack Environmental Deep Learning Platform (YOLO + CNN)
#### Featuring the 5 Signature Innovations: EcoTwin, EcoGuard, EcoRoute, EcoPulse, and EcoLoop

EcoVision AI is an end-to-end computer vision and waste intelligence platform that identifies discarded items, draws bounding boxes around detected objects, determines fine-grained material subtypes, assesses surface contamination, routes items to appropriate waste streams, and encourages responsible recycling action.

The system combines **YOLO for real-time spatial object detection** with a dedicated **PyTorch CNN classifier for fine-grained material subtype classification**, backed by a MongoDB persistent database, interactive analytics dashboard, and Arduino smart segregation support.

The platform workflow follows the core paradigm:
**Detect → Verify → Assess → Recommend → Track → Learn → Improve**

---

## 🌟 The 5 Signature Innovation Modules

### 1. 🆔 EcoTwin™ — Digital Waste Identity & Lifecycle Tracking
- Assigns a unique item-level identity (`ECO-XXXX`) to each analyzed detection record.
- Maintains an immutable audit trail of lifecycle states:
  `detected` ➔ `classified` ➔ `needs_review` ➔ `recommendation_generated` ➔ `action_confirmed` ➔ `closed`.
- Records actor provenance, timestamps, bounding box coordinates, and transitions.
- Interactive timeline inspection with full decision history.

### 2. 🛡️ EcoGuard™ — Confidence-Aware AI & Uncertainty Detection
- Evaluates YOLO vs CNN consensus (`full_agreement`, `refinement`, `disputed`, `low_confidence`).
- **Optical Surface Contamination Inspection**: Scans for visible food residues, grease stains, and liquid puddles, computing an explainable Segregation Readiness score.
- **Human-in-the-Loop Review Queue**: Flags high-uncertainty and conflicting predictions for expert review.
- User/expert corrections are recorded and quarantined for verified retraining dataset candidates.

### 3. 🧭 EcoRoute™ — Context-Aware Disposal & Smart Segregation
- Maps recognized items to 8 canonical waste streams: *Plastics, Paper, Metal, Glass, Organic, E-Waste, Landfill, Medical*.
- Configurable municipal stream architectures: **2-Stream**, **3-Stream**, **4-Stream**, or **6-Stream Dedicated MRF**.
- Provides dynamic preparation checklists (rinse, crush, tape lithium terminals, remove caps).
- Dispatches target sorting angles to Arduino servo sorting gates (30° to 180°) with Emergency Stop lock.

### 4. 📈 EcoPulse™ — Waste Pattern Analytics & Predictive Intelligence
- Real-time MongoDB aggregations for material volume breakdowns, 14-day longitudinal trends, and average readiness indices.
- **7-Day Predictive Forecasting**: Baseline linear regression forecasting with 95% upper and lower uncertainty bounds (requires $\ge 5$ observation days).
- Evidence-backed municipal policy insights based on observed category recurrence and disagreement rates.

### 5. 🔁 EcoLoop™ — User Learning, Gamification & Sustainable Action Tracking
- **Verified Action Tracking**: Users confirm physical disposal actions to earn non-duplicated EcoPoints (+25 PTS per item).
- **Duplicate Prevention Guarantee**: Compound unique database indexes guarantee no duplicate reward claims can be made for the same detection record.
- **Circular Intelligence Quiz**: Interactive educational quizzes with instant explanations explaining why items belong in specific recycling streams.
- **Badges & Leaderboard**: Level tiers (*Eco Apprentice* to *Planetary Steward*), milestone achievements, and privacy-preserving opt-in community rankings.

---

## 🏗️ Technology Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Recharts, Lucide React.
- **Backend**: Node.js, Express.js, TypeScript, Mongoose, JWT authentication, Multer, automatic in-memory MongoDB fallback.
- **AI Service**: Python 3.12, FastAPI, Ultralytics YOLO, PyTorch, Torchvision, OpenCV, NumPy, Pillow, Uvicorn.
- **Database**: MongoDB (Local, Atlas, or embedded in-memory zero-config fallback).
- **Hardware Integration**: Arduino serial controller adapter + interactive visual web simulator with 6 sorting compartments and E-Stop.

---

## 📁 Repository Structure

```
yolo+CNN/
├── ai-service/                   # FastAPI Python Inference Service
│   ├── app/
│   │   ├── models/               # YOLO detector, CNN classifier, Fusion Engine, Annotator
│   │   ├── services/             # Video processor, Arduino controller
│   │   ├── config.py             # Settings and confidence thresholds
│   │   ├── schemas.py            # Pydantic schemas (EcoTwin, EcoGuard, Contamination)
│   │   └── main.py               # FastAPI REST endpoints
│   ├── training/                 # train_yolo.py, train_cnn.py, evaluate.py
│   ├── tests/                    # 9 Unit tests for fusion, contamination, & Arduino
│   └── requirements.txt
├── backend/                      # Express.js REST API
│   ├── src/
│   │   ├── config/db.ts          # MongoDB connection with in-memory fallback
│   │   ├── models/               # WasteRecord (EcoTwin), UserAction, ReviewFeedback, User, DetectionSession, DisposalRule
│   │   ├── routes/               # ecotwin, ecoguard, ecoroute, ecopulse, ecoloop, auth, detections, arduino
│   │   ├── seeds/seedData.ts     # Initial disposal rules, benchmark, and 6 sample EcoTwin records
│   │   └── server.ts             # Express entrypoint
│   └── test/                     # 9 Backend unit & integration tests
├── frontend/                     # Next.js React Web Application
│   ├── src/
│   │   ├── app/                  # App Router layout, globals.css, and main page
│   │   ├── components/           # EcoTwinView, EcoGuardView, EcoRouteView, EcoPulseView, EcoLoopView, DetectionStudio, etc.
│   │   ├── context/              # AuthContext (JWT management)
│   │   └── services/api.ts       # Typed API client for all 5 innovation modules
│   └── tailwind.config.js
├── shared/                       # Shared TypeScript types and category registries
├── docs/                         # Architecture, dataset, and API documentation
├── docker-compose.yml            # Multi-container Docker orchestration
├── .env.example
└── README.md
```

---

## 🚀 Quick-Start Setup (Windows PowerShell)

### Prerequisites
- Node.js v18+ (Node 24 tested)
- Python 3.12+
- MongoDB (optional; backend includes automatic in-memory fallback)

---

### Step 1: Start the AI Inference Service (Port 8000)

```powershell
cd ai-service

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Start FastAPI server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Health Check: `http://localhost:8000/health`  
Interactive Docs: `http://localhost:8000/docs`

---

### Step 2: Start the Backend API (Port 5000)

Open a new PowerShell terminal:
```powershell
cd backend
npm install
npm run build
npm start
```
Health Check: `http://localhost:5000/api/health`

---

### Step 3: Start the Next.js Frontend (Port 3000)

Open a new PowerShell terminal:
```powershell
cd frontend
npm install
npm run dev
```
Open **http://localhost:3000** in your browser.

---

## 🧪 Automated Testing Suite

### 1. AI Service Unit Tests (9 Tests Passed)
Verifies category mapping, disposal rules, prediction fusion agreement, disagreement auditing, low-confidence filtering, contamination assessment, and Arduino safety interlocks:
```powershell
$env:PYTHONPATH="ai-service"
.\ai-service\venv\Scripts\python -m pytest ai-service/tests/test_ai_service.py
```
*Result: 9 passed in 7.0s.*

### 2. Backend Integration Tests (9 Tests Passed)
Verifies health endpoint, JWT user registration & authentication, disposal rules query, EcoTwin status transition, EcoGuard review queue & correction workflow, EcoRoute recommendations, EcoPulse forecasting, EcoLoop duplicate-proof action logging (HTTP 409 Conflict check), and quiz scoring:
```powershell
cd backend
npm test
```
*Result: 9 passed, 0 failures in 3.6s.*

### 3. Frontend Production Build
Validates all React 18, Next.js 14, TypeScript, and Tailwind code:
```powershell
cd frontend
npm run build
```
*Result: ✓ Compiled successfully, 4/4 static pages generated.*

---

## ⚙️ Arduino Smart Segregation Protocol

The system sends simple ASCII commands over serial or simulation:
- `MOVE 30` → Plastics Bin (Angle: 30°)
- `MOVE 60` → Paper & Cardboard Bin (Angle: 60°)
- `MOVE 90` → Metals & Cans Bin (Angle: 90°)
- `MOVE 120` → Glass Bin (Angle: 120°)
- `MOVE 150` → Organic Bin (Angle: 150°)
- `MOVE 180` → E-Waste Bin (Angle: 180°)
- `ESTOP` → Locks servo at 0° and trips emergency interlock.

Click the **Arduino Sorter** button in the top navigation to interact with the live servo simulator.

---

## 📜 Ethical Disclaimers & Limitations
- **Optical Inspection**: Surface cleanliness assessments identify visible residue; they do not certify biological sterilization or chemical purity.
- **Digital Identity vs Physical Tracking**: EcoTwin IDs establish a digital audit identity across application states; physical item tracking requires tagged hardware integration.
- **Detection vs Municipal Recycling**: Detection counts measure items presented to the vision system and do not measure certified municipal recycling rates or carbon offsets.
- **Hardware Simulation**: The software simulator models gate movements for verification and is clearly marked as simulated until paired with an active physical COM serial port.

---

## 📜 License
Developed as a production-minded environmental deep learning platform. Open research and academic use permitted under MIT License.
