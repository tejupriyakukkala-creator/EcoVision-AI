# EcoVision AI — Complete REST API Specification

EcoVision AI features two decoupled, high-performance API services:
1. **Express Backend API** (`http://localhost:5000/api`) — User authentication, persistence, business logic, analytics, and the 5 Innovation Modules.
2. **FastAPI AI Inference Service** (`http://localhost:8000`) — YOLO object localization, CNN crop classification, decision fusion, optical contamination assessment, and Arduino hardware actuation.

---

## 1. Authentication Endpoints

- `POST /api/auth/register` — Create new user account.
  - Body: `{ name, email, password }`
  - Returns: `{ message, token, user }`
- `POST /api/auth/login` — Authenticate and obtain JWT token.
  - Body: `{ email, password }`
  - Returns: `{ message, token, user }`
- `GET /api/auth/me` — Retrieve profile of currently authenticated user.
  - Headers: `Authorization: Bearer <token>`

---

## 2. Detection & Inference Endpoints

- `POST /api/detections` — Upload image, video, or webcam frame for YOLO + CNN analysis.
  - Form-Data: `file` (Image/Video), `confidence` (float), `inputType` (`image` | `video` | `webcam_frame`), `imageBase64` (for webcam)
  - Creates both `Detection` records and `WasteRecord` (EcoTwin) digital identities.
  - Returns: `{ session, detections, wasteRecords, annotatedImage, processingTimeMs }`
- `GET /api/detections` — Paginated and filterable detection sessions.
  - Query Params: `page`, `limit`, `category`, `search`, `startDate`, `endDate`
- `GET /api/detections/:id` — Full details of a detection session, including localized items and EcoTwin records.
- `DELETE /api/detections/:id` — Delete a detection session and related detection records.
- `GET /api/detections/:id/export?format=csv|json` — Export session detections as CSV or JSON.

---

## 3. Innovation Module 01: EcoTwin™ Endpoints

- `GET /api/ecotwin` — Searchable query of digital waste identities.
  - Query Params: `page`, `limit`, `category`, `lifecycleStatus`, `reviewStatus`, `search`
  - Returns: `{ records, total, page, pages }`
- `GET /api/ecotwin/:id` — Retrieve specific waste record by `recordId` (e.g. `ECO-1024`) or MongoDB `_id`.
- `GET /api/ecotwin/:id/timeline` — Retrieve the immutable lifecycle audit events timeline and corrections for a waste item.
- `PATCH /api/ecotwin/:id/status` — Transition lifecycle state (`detected`, `classified`, `needs_review`, `recommendation_generated`, `action_confirmed`, `closed`).
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ newStatus, note }`

---

## 4. Innovation Module 02: EcoGuard™ Endpoints

- `GET /api/ecoguard/review-queue` — Retrieve items flagged for human review due to model disagreements, low confidence, or visible surface contamination.
  - Query Params: `priority`, `category`, `page`, `limit`
- `POST /api/ecoguard/:id/corrections` — Submit user or expert correction.
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ correctedPrediction, correctedCategory, reason, notes }`
  - Updates record state to `confirmed` and creates a quarantined `ReviewFeedback` audit record.
- `GET /api/ecoguard/model-agreement` — Statistics on YOLO vs CNN consensus, agreement rates, average readiness, and cleanliness compliance.
- `GET /api/ecoguard/feedback` — List audit review feedback records.

---

## 5. Innovation Module 03: EcoRoute™ Endpoints

- `POST /api/ecoroute/recommend` — Context-aware disposal guidance engine.
  - Body: `{ wasteCategory, subtype, hasVisibleResidue, contaminationScore, locality, binConfig }`
  - Supports `2-stream`, `3-stream`, `4-stream`, and `6-stream` architectures.
  - Returns: `{ targetBin, binColor, binConfig, preparationInstructions, recyclingEligibility, servoGateAngle, ruleSource }`
- `GET /api/ecoroute/rules` — Retrieve standardized disposal rules across all 8 material streams.
- `POST /api/ecoroute/feedback` — Report municipal rule exceptions or feedback.

---

## 6. Innovation Module 04: EcoPulse™ Endpoints

- `GET /api/ecopulse/summary` — Waste intelligence metrics: total detections, dominant category, average segregation readiness, disagreement rates, and evidence-backed recommendations.
- `GET /api/ecopulse/trends?days=14` — Longitudinal daily detection frequency broken down by stream.
- `GET /api/ecopulse/forecasts` — 7-day predictive volume forecasting with 95% upper and lower uncertainty bounds (requires $\ge 5$ observation days).

---

## 7. Innovation Module 05: EcoLoop™ Endpoints

- `GET /api/ecoloop/profile` — User's gamification profile: points, level tier, confirmed actions count, unlocked achievements, recent actions.
- `GET /api/ecoloop/actions` — User's confirmed physical segregation action log.
- `POST /api/ecoloop/actions` — Confirm physical segregation action.
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ recordId, actionType, disposalBinSelected, notes }`
  - **Duplicate Prevention Guarantee**: Compound database unique index on `{ userId, recordId }` strictly rejects duplicate claims with `409 Conflict`.
- `GET /api/ecoloop/achievements` — List available and unlocked sustainability milestones.
- `GET /api/ecoloop/learning` — Circular economy micro-tips and quiz questions.
- `POST /api/ecoloop/quiz-attempts` — Submit quiz answers, calculate score, and award points.
- `GET /api/ecoloop/leaderboard` — Opt-in community recycler leaderboard.

---

## 8. FastAPI AI Service Endpoints (`http://localhost:8000`)

- `GET /health` — Health check, device compute status (`cuda` or `cpu`).
- `GET /models/status` — Weights version, thresholds, supported categories.
- `POST /predict/image` — Accepts image file, executes YOLO localization, CNN crop classification, optical surface contamination analysis, and decision fusion.
- `POST /predict/video-frame` — Low-latency webcam frame inference.
- `POST /predict/video` — Frame-by-frame video processor with spatial IoU multi-frame deduplication.
- `POST /predict/batch` — Bulk multi-image detection.
- `POST /arduino/trigger` — Servo hardware or visual simulator actuation.
- `POST /arduino/estop` — Emergency stop interlock.
- `POST /arduino/reset` — Reset emergency stop interlock.
