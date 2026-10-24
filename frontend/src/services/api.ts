export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

function getHeaders(token?: string | null, isJson: boolean = true): HeadersInit {
  const headers: Record<string, string> = {};
  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // Detection APIs
  async detectMedia(formData: FormData, token?: string | null) {
    const res = await fetch(`${API_BASE}/detections`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(err.error || 'Failed to analyze media');
    }
    return res.json();
  },

  async detectWebcamFrame(imageBase64: string, confidence: number = 0.25, saveSession: boolean = false, token?: string | null) {
    const res = await fetch(`${API_BASE}/detections`, {
      method: 'POST',
      headers: getHeaders(token, true),
      body: JSON.stringify({
        inputType: 'webcam_frame',
        imageBase64,
        confidence,
        saveSession,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Frame inference failed' }));
      throw new Error(err.error || 'Webcam analysis failed');
    }
    return res.json();
  },

  async getSessions(params: { page?: number; limit?: number; category?: string; search?: string; startDate?: string; endDate?: string }, token?: string | null) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.category && params.category !== 'All') query.append('category', params.category);
    if (params.search) query.append('search', params.search);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);

    const res = await fetch(`${API_BASE}/detections?${query.toString()}`, {
      headers: getHeaders(token, false),
    });
    if (!res.ok) throw new Error('Failed to fetch history');
    return res.json();
  },

  async getSessionById(id: string, token?: string | null) {
    const res = await fetch(`${API_BASE}/detections/${id}`, {
      headers: getHeaders(token, false),
    });
    if (!res.ok) throw new Error('Failed to fetch session');
    return res.json();
  },

  async deleteSession(id: string, token?: string | null) {
    const res = await fetch(`${API_BASE}/detections/${id}`, {
      method: 'DELETE',
      headers: getHeaders(token, false),
    });
    if (!res.ok) throw new Error('Failed to delete session');
    return res.json();
  },

  // Analytics APIs
  async getAnalyticsSummary(params: { startDate?: string; endDate?: string; userOnly?: boolean }, token?: string | null) {
    const query = new URLSearchParams();
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    if (params.userOnly) query.append('userOnly', 'true');

    const res = await fetch(`${API_BASE}/analytics/summary?${query.toString()}`, {
      headers: getHeaders(token, false),
    });
    if (!res.ok) throw new Error('Failed to fetch summary');
    return res.json();
  },

  async getAnalyticsTrends(days: number = 14) {
    const res = await fetch(`${API_BASE}/analytics/trends?days=${days}`);
    if (!res.ok) throw new Error('Failed to fetch trends');
    return res.json();
  },

  async getWasteInsights() {
    const res = await fetch(`${API_BASE}/analytics/insights`);
    if (!res.ok) throw new Error('Failed to fetch insights');
    return res.json();
  },

  // Disposal Rules
  async getDisposalRules(category?: string, search?: string) {
    const query = new URLSearchParams();
    if (category && category !== 'All') query.append('category', category);
    if (search) query.append('search', search);

    const res = await fetch(`${API_BASE}/disposal-rules?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch disposal rules');
    return res.json();
  },

  // Model Metadata
  async getModelStatus() {
    const res = await fetch(`${API_BASE}/models/status`);
    if (!res.ok) throw new Error('Failed to fetch model status');
    return res.json();
  },

  async getModelEvaluations() {
    const res = await fetch(`${API_BASE}/models/evaluations`);
    if (!res.ok) throw new Error('Failed to fetch model evaluations');
    return res.json();
  },

  // Arduino Actuation & Simulator
  async triggerArduino(category: string, subtype: string, confidence: number, simulation: boolean = true) {
    const res = await fetch(`${API_BASE}/arduino/trigger`, {
      method: 'POST',
      headers: getHeaders(null, true),
      body: JSON.stringify({ category, subtype, confidence, simulation }),
    });
    if (!res.ok) throw new Error('Failed to actuate Arduino');
    return res.json();
  },

  async estopArduino() {
    const res = await fetch(`${API_BASE}/arduino/estop`, {
      method: 'POST',
      headers: getHeaders(null, true),
    });
    if (!res.ok) throw new Error('Emergency stop command failed');
    return res.json();
  },

  async resetArduino() {
    const res = await fetch(`${API_BASE}/arduino/reset`, {
      method: 'POST',
      headers: getHeaders(null, true),
    });
    if (!res.ok) throw new Error('Emergency stop reset failed');
    return res.json();
  },

  // 1. EcoTwin APIs
  async getEcoTwinRecords(params: { page?: number; limit?: number; category?: string; lifecycleStatus?: string; reviewStatus?: string; search?: string }, token?: string | null) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.category && params.category !== 'All') query.append('category', params.category);
    if (params.lifecycleStatus && params.lifecycleStatus !== 'All') query.append('lifecycleStatus', params.lifecycleStatus);
    if (params.reviewStatus && params.reviewStatus !== 'All') query.append('reviewStatus', params.reviewStatus);
    if (params.search) query.append('search', params.search);

    const res = await fetch(`${API_BASE}/ecotwin?${query.toString()}`, {
      headers: getHeaders(token, false),
    });
    if (!res.ok) throw new Error('Failed to fetch EcoTwin records');
    return res.json();
  },

  async getEcoTwinRecord(id: string, token?: string | null) {
    const res = await fetch(`${API_BASE}/ecotwin/${id}`, {
      headers: getHeaders(token, false),
    });
    if (!res.ok) throw new Error('Failed to fetch EcoTwin record');
    return res.json();
  },

  async getEcoTwinTimeline(id: string, token?: string | null) {
    const res = await fetch(`${API_BASE}/ecotwin/${id}/timeline`, {
      headers: getHeaders(token, false),
    });
    if (!res.ok) throw new Error('Failed to fetch lifecycle timeline');
    return res.json();
  },

  async updateEcoTwinStatus(id: string, newStatus: string, note?: string, token?: string | null) {
    const res = await fetch(`${API_BASE}/ecotwin/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(token, true),
      body: JSON.stringify({ newStatus, note }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Update failed' }));
      throw new Error(err.error || 'Failed to update lifecycle status');
    }
    return res.json();
  },

  // 2. EcoGuard APIs
  async getReviewQueue(params: { priority?: string; category?: string; page?: number; limit?: number }, token?: string | null) {
    const query = new URLSearchParams();
    if (params.priority && params.priority !== 'All') query.append('priority', params.priority);
    if (params.category && params.category !== 'All') query.append('category', params.category);
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());

    const res = await fetch(`${API_BASE}/ecoguard/review-queue?${query.toString()}`, {
      headers: getHeaders(token, false),
    });
    if (!res.ok) throw new Error('Failed to fetch review queue');
    return res.json();
  },

  async submitCorrection(id: string, data: { correctedPrediction: string; correctedCategory: string; reason: string; notes?: string }, token?: string | null) {
    const res = await fetch(`${API_BASE}/ecoguard/${id}/corrections`, {
      method: 'POST',
      headers: getHeaders(token, true),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Correction failed' }));
      throw new Error(err.error || 'Failed to submit correction');
    }
    return res.json();
  },

  async getModelAgreement() {
    const res = await fetch(`${API_BASE}/ecoguard/model-agreement`);
    if (!res.ok) throw new Error('Failed to fetch model agreement metrics');
    return res.json();
  },

  // 3. EcoRoute APIs
  async getEcoRouteRecommendation(data: { wasteCategory: string; subtype?: string; hasVisibleResidue?: boolean; contaminationScore?: number; locality?: string; binConfig?: string }) {
    const res = await fetch(`${API_BASE}/ecoroute/recommend`, {
      method: 'POST',
      headers: getHeaders(null, true),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to get disposal recommendation');
    return res.json();
  },

  async getEcoRouteRules() {
    const res = await fetch(`${API_BASE}/ecoroute/rules`);
    if (!res.ok) throw new Error('Failed to fetch rules');
    return res.json();
  },

  // 4. EcoPulse APIs
  async getEcoPulseSummary() {
    const res = await fetch(`${API_BASE}/ecopulse/summary`);
    if (!res.ok) throw new Error('Failed to fetch EcoPulse summary');
    return res.json();
  },

  async getEcoPulseTrends(days: number = 14) {
    const res = await fetch(`${API_BASE}/ecopulse/trends?days=${days}`);
    if (!res.ok) throw new Error('Failed to fetch EcoPulse trends');
    return res.json();
  },

  async getEcoPulseForecasts() {
    const res = await fetch(`${API_BASE}/ecopulse/forecasts`);
    if (!res.ok) throw new Error('Failed to fetch forecasts');
    return res.json();
  },

  // 5. EcoLoop APIs
  async getEcoLoopProfile(token?: string | null) {
    const res = await fetch(`${API_BASE}/ecoloop/profile`, {
      headers: getHeaders(token, false),
    });
    if (!res.ok) throw new Error('Failed to fetch profile');
    return res.json();
  },

  async getEcoLoopActions(token?: string | null) {
    const res = await fetch(`${API_BASE}/ecoloop/actions`, {
      headers: getHeaders(token, false),
    });
    if (!res.ok) throw new Error('Failed to fetch actions');
    return res.json();
  },

  async recordEcoLoopAction(data: { recordId: string; actionType?: string; disposalBinSelected?: string; notes?: string }, token?: string | null) {
    const res = await fetch(`${API_BASE}/ecoloop/actions`, {
      method: 'POST',
      headers: getHeaders(token, true),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Action failed' }));
      throw new Error(err.error || 'Failed to record action');
    }
    return res.json();
  },

  async getEcoLoopLearning() {
    const res = await fetch(`${API_BASE}/ecoloop/learning`);
    if (!res.ok) throw new Error('Failed to fetch learning content');
    return res.json();
  },

  async submitQuizAttempt(answers: Array<{ questionId: string; selectedOption: number }>, token?: string | null) {
    const res = await fetch(`${API_BASE}/ecoloop/quiz-attempts`, {
      method: 'POST',
      headers: getHeaders(token, true),
      body: JSON.stringify({ answers }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Quiz submission failed' }));
      throw new Error(err.error || 'Failed to grade quiz');
    }
    return res.json();
  },

  async getLeaderboard() {
    const res = await fetch(`${API_BASE}/ecoloop/leaderboard`);
    if (!res.ok) throw new Error('Failed to fetch leaderboard');
    return res.json();
  },
};
