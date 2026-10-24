import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import app from '../dist/server.js';
import { connectDB, disconnectDB } from '../dist/config/db.js';
import { seedInitialDatabase } from '../dist/seeds/seedData.js';

let server;
let baseUrl;
let authToken;

test.before(async () => {
  await connectDB();
  await seedInitialDatabase();
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (server) {
    await new Promise((res) => server.close(res));
  }
  await disconnectDB();
  setTimeout(() => process.exit(0), 100);
});

test('GET /api/health returns online status', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.status, 'online');
  assert.strictEqual(data.service, 'EcoVision AI Backend API');
});

test('POST /api/auth/register & login workflow', async () => {
  const email = `test-${Date.now()}@ecovision.org`;
  const registerRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Eco Tester',
      email,
      password: 'SecurePassword123!',
    }),
  });

  assert.strictEqual(registerRes.status, 201);
  const regData = await registerRes.json();
  assert.ok(regData.token);
  assert.strictEqual(regData.user.email, email);
  authToken = regData.token;

  // Login
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'SecurePassword123!',
    }),
  });

  assert.strictEqual(loginRes.status, 200);
  const loginData = await loginRes.json();
  assert.ok(loginData.token);

  // Get current user profile
  const meRes = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${loginData.token}` },
  });
  assert.strictEqual(meRes.status, 200);
  const meData = await meRes.json();
  assert.strictEqual(meData.user.email, email);
});

test('GET /api/disposal-rules returns seeded guidelines', async () => {
  const res = await fetch(`${baseUrl}/api/disposal-rules`);
  assert.strictEqual(res.status, 200);
  const rules = await res.json();
  assert.ok(Array.isArray(rules));
  assert.ok(rules.length >= 8);
  const plasticRule = rules.find((r) => r.itemSubtype === 'plastic bottle');
  assert.ok(plasticRule);
  assert.strictEqual(plasticRule.recyclingEligibility, true);
});

test('EcoTwin: GET /api/ecotwin, timeline & status transition', async () => {
  const res = await fetch(`${baseUrl}/api/ecotwin`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.records));
  assert.ok(data.records.length > 0);

  const sampleRecord = data.records[0];
  assert.ok(sampleRecord.recordId.startsWith('ECO-'));

  // Fetch timeline
  const timelineRes = await fetch(`${baseUrl}/api/ecotwin/${sampleRecord.recordId}/timeline`);
  assert.strictEqual(timelineRes.status, 200);
  const timelineData = await timelineRes.json();
  assert.ok(Array.isArray(timelineData.timeline));
  assert.ok(timelineData.timeline.length > 0);

  // Patch status transition
  const patchRes = await fetch(`${baseUrl}/api/ecotwin/${sampleRecord.recordId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      newStatus: 'closed',
      note: 'Verified completed segregation cycle in audit test',
    }),
  });
  assert.strictEqual(patchRes.status, 200);
  const patchData = await patchRes.json();
  assert.strictEqual(patchData.record.lifecycleStatus, 'closed');
});

test('EcoGuard: GET review-queue, agreement metrics & submit correction', async () => {
  const queueRes = await fetch(`${baseUrl}/api/ecoguard/review-queue`);
  assert.strictEqual(queueRes.status, 200);
  const queueData = await queueRes.json();
  assert.ok(Array.isArray(queueData.queue));

  const agreementRes = await fetch(`${baseUrl}/api/ecoguard/model-agreement`);
  assert.strictEqual(agreementRes.status, 200);
  const agreementData = await agreementRes.json();
  assert.ok(typeof agreementData.agreementRatePercent === 'number');
  assert.ok(typeof agreementData.averageReadinessScore === 'number');

  // Submit correction for ECO-5380 (E-Waste item)
  const corrRes = await fetch(`${baseUrl}/api/ecoguard/ECO-5380/corrections`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      correctedPrediction: 'electronic device',
      correctedCategory: 'E-Waste',
      reason: 'Confirmed circuit board and lithium battery compartment by visual inspector',
      notes: 'Passed audit review for retraining candidate',
    }),
  });

  assert.strictEqual(corrRes.status, 200);
  const corrData = await corrRes.json();
  assert.strictEqual(corrData.record.finalClassification, 'electronic device');
  assert.strictEqual(corrData.record.reviewStatus, 'confirmed');
});

test('EcoRoute: POST /api/ecoroute/recommend returns dynamic route & servo angle', async () => {
  const recRes = await fetch(`${baseUrl}/api/ecoroute/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      wasteCategory: 'Plastics',
      subtype: 'plastic bottle',
      hasVisibleResidue: false,
      binConfig: '4-stream',
    }),
  });

  assert.strictEqual(recRes.status, 200);
  const recData = await recRes.json();
  assert.strictEqual(recData.targetBin, 'Containers (Plastics & Metals)');
  assert.strictEqual(recData.servoGateAngle, 30);
  assert.strictEqual(recData.recyclingEligibility, true);
  assert.ok(recData.preparationInstructions.length > 0);
});

test('EcoPulse: GET summary & forecasting endpoint', async () => {
  const summaryRes = await fetch(`${baseUrl}/api/ecopulse/summary`);
  assert.strictEqual(summaryRes.status, 200);
  const summaryData = await summaryRes.json();
  assert.ok(summaryData.totalDetections > 0);
  assert.ok(Array.isArray(summaryData.insights));

  const forecastRes = await fetch(`${baseUrl}/api/ecopulse/forecasts`);
  assert.strictEqual(forecastRes.status, 200);
  const forecastData = await forecastRes.json();
  assert.ok('hasSufficientData' in forecastData);
  if (forecastData.hasSufficientData) {
    assert.ok(Array.isArray(forecastData.forecast));
    assert.strictEqual(forecastData.forecast.length, 7);
  }
});

test('EcoLoop: Action recording with duplicate reward prevention', async () => {
  // First action submission should succeed
  const actionRes = await fetch(`${baseUrl}/api/ecoloop/actions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      recordId: 'ECO-1024',
      actionType: 'segregated_correctly',
      disposalBinSelected: 'Plastics Stream',
    }),
  });

  assert.strictEqual(actionRes.status, 201);
  const actionData = await actionRes.json();
  assert.strictEqual(actionData.pointsAwarded, 25);

  // Second duplicate action submission for SAME record and user MUST be rejected with 409 Conflict!
  const dupRes = await fetch(`${baseUrl}/api/ecoloop/actions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      recordId: 'ECO-1024',
      actionType: 'segregated_correctly',
    }),
  });

  assert.strictEqual(dupRes.status, 409);
  const dupData = await dupRes.json();
  assert.ok(dupData.error.includes('already awarded'));
});

test('EcoLoop: Learning questions and quiz attempt scoring', async () => {
  const learnRes = await fetch(`${baseUrl}/api/ecoloop/learning`);
  assert.strictEqual(learnRes.status, 200);
  const learnData = await learnRes.json();
  assert.ok(Array.isArray(learnData.quiz));
  assert.ok(learnData.quiz.length > 0);

  // Submit quiz attempt
  const attemptRes = await fetch(`${baseUrl}/api/ecoloop/quiz-attempts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      answers: [
        { questionId: 'q1', selectedOption: 1 },
        { questionId: 'q2', selectedOption: 1 },
      ],
    }),
  });

  assert.strictEqual(attemptRes.status, 200);
  const attemptData = await attemptRes.json();
  assert.strictEqual(attemptData.score, 2);
  assert.strictEqual(attemptData.percentage, 100);
  assert.strictEqual(attemptData.passed, true);
  assert.ok(attemptData.pointsEarned > 0);
});
