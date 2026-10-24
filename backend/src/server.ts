import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { connectDB } from './config/db.js';
import { seedInitialDatabase } from './seeds/seedData.js';
import { authRouter } from './routes/auth.routes.js';
import { detectionRouter } from './routes/detection.routes.js';
import { analyticsRouter } from './routes/analytics.routes.js';
import { disposalRulesRouter } from './routes/disposalRules.routes.js';
import { modelRouter } from './routes/model.routes.js';
import { arduinoRouter } from './routes/arduino.routes.js';
import { ecotwinRouter } from './routes/ecotwin.routes.js';
import { ecoguardRouter } from './routes/ecoguard.routes.js';
import { ecorouteRouter } from './routes/ecoroute.routes.js';
import { ecopulseRouter } from './routes/ecopulse.routes.js';
import { ecoloopRouter } from './routes/ecoloop.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads directory
const UPLOAD_DIR = path.resolve('uploads');
app.use('/uploads', express.static(UPLOAD_DIR));

// API Root & Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    service: 'EcoVision AI Backend API',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/auth', authRouter);
app.use('/api/detections', detectionRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/disposal-rules', disposalRulesRouter);
app.use('/api/models', modelRouter);
app.use('/api/arduino', arduinoRouter);

// Innovation Modules (EcoTwin, EcoGuard, EcoRoute, EcoPulse, EcoLoop)
app.use('/api/ecotwin', ecotwinRouter);
app.use('/api/ecoguard', ecoguardRouter);
app.use('/api/ecoroute', ecorouteRouter);
app.use('/api/ecopulse', ecopulseRouter);
app.use('/api/ecoloop', ecoloopRouter);

// Lazy DB connection middleware for serverless invocations (e.g. Vercel)
app.use(async (_req, _res, next) => {
  try {
    await connectDB();
  } catch (err) {
    console.warn('[Serverless DB Connect Warning]:', err);
  }
  next();
});

// Centralized error handler
app.use(errorHandler);

export async function startServer() {
  try {
    await connectDB();
    await seedInitialDatabase();

    return app.listen(PORT, () => {
      console.log(`[EcoVision Backend] Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[EcoVision Backend] Failed to start server:', err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  startServer();
}

export default app;
