'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Trophy,
  Award,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Check,
  X,
  HelpCircle,
  Medal,
  RefreshCw,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function EcoLoopView() {
  const { user, token } = useAuth();
  const [profile, setProfile] = useState<any | null>(null);
  const [learningContent, setLearningContent] = useState<any | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizResult, setQuizResult] = useState<any | null>(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [profRes, learnRes, leadRes] = await Promise.all([
        api.getEcoLoopProfile(token),
        api.getEcoLoopLearning(),
        api.getLeaderboard(),
      ]);
      setProfile(profRes);
      setLearningContent(learnRes);
      setLeaderboard(leadRes || []);
    } catch (err) {
      console.error('Failed to load EcoLoop gamification data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleSelectOption = (questionId: string, optionIdx: number) => {
    setQuizAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));
  };

  const handleSubmitQuiz = async () => {
    if (!token) {
      alert('Please log in or sign up to record quiz points and earn badges!');
      return;
    }

    const answersPayload = Object.entries(quizAnswers).map(([questionId, selectedOption]) => ({
      questionId,
      selectedOption,
    }));

    if (answersPayload.length === 0) {
      alert('Please answer at least one question before submitting.');
      return;
    }

    try {
      setSubmittingQuiz(true);
      const res = await api.submitQuizAttempt(answersPayload, token);
      setQuizResult(res);
      fetchData(); // refresh points
    } catch (err: any) {
      alert(err.message || 'Failed to submit quiz attempt');
    } finally {
      setSubmittingQuiz(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-950/50 via-slate-900 to-slate-900 p-8 border border-purple-500/20 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Innovation Module 05
              </span>
              <span className="text-xs text-slate-400">Gamification, Learning & Action Tracking</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              EcoLoop™ Sustainability Hub
            </h1>
            <p className="text-slate-300 max-w-2xl text-sm leading-relaxed">
              Transforming waste classification into verified human action. Earn non-duplicated EcoPoints for confirmed sorting actions, test your recycling knowledge, and unlock sustainability badges.
            </p>
          </div>
          <button
            onClick={fetchData}
            className="self-start md:self-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Profile
          </button>
        </div>
      </div>

      {/* Gamification Profile Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-950/40 to-slate-900 p-6 rounded-2xl border border-emerald-500/30 space-y-2">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-emerald-400" /> Total EcoPoints
          </div>
          <div className="text-3xl font-black text-white font-mono">
            {profile?.totalPoints ?? 0} <span className="text-sm font-normal text-emerald-400">PTS</span>
          </div>
          <p className="text-[11px] text-slate-400">Earned from confirmed actions & quizzes</p>
        </div>

        <div className="bg-gradient-to-br from-purple-950/40 to-slate-900 p-6 rounded-2xl border border-purple-500/30 space-y-2">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <Medal className="w-4 h-4 text-purple-400" /> Current Rank Tier
          </div>
          <div className="text-2xl font-bold text-white truncate">
            {profile?.levelName ?? 'Eco Apprentice'}
          </div>
          <p className="text-[11px] text-purple-300">Level {profile?.level ?? 1}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-950/40 to-slate-900 p-6 rounded-2xl border border-blue-500/30 space-y-2">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-blue-400" /> Confirmed Sorts
          </div>
          <div className="text-3xl font-black text-white font-mono">
            {profile?.actionsCount ?? 0}
          </div>
          <p className="text-[11px] text-slate-400">Physical sorting actions verified</p>
        </div>

        <div className="bg-gradient-to-br from-amber-950/40 to-slate-900 p-6 rounded-2xl border border-amber-500/30 space-y-2">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-400" /> Badges Unlocked
          </div>
          <div className="text-3xl font-black text-white font-mono">
            {profile?.unlockedAchievements?.length ?? 0}
          </div>
          <p className="text-[11px] text-slate-400">Out of 4 milestones</p>
        </div>
      </div>

      {/* Grid: Achievements Gallery & Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Achievements Gallery (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-5 shadow-xl">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" /> Achievements & Sustainable Milestones
          </h3>
          <p className="text-xs text-slate-400">Earn recognition for maintaining high-integrity circular recycling habits</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              {
                id: 'first_action',
                title: 'First Step to Zero Waste',
                desc: 'Confirm your first waste segregation action in EcoVision.',
                pts: 50,
                target: 1,
              },
              {
                id: 'five_sorts',
                title: 'Consistent Recycler',
                desc: 'Confirm 5 responsible waste segregation actions.',
                pts: 100,
                target: 5,
              },
              {
                id: 'ten_sorts',
                title: 'Waste Diversion Champion',
                desc: 'Successfully segregate 10 items according to EcoRoute rules.',
                pts: 250,
                target: 10,
              },
              {
                id: 'quiz_master',
                title: 'EcoScholar',
                desc: 'Score 100% on the EcoLoop waste intelligence quiz.',
                pts: 150,
                target: 1,
              },
            ].map((ach) => {
              const isUnlocked = profile?.unlockedAchievements?.some((u: any) => u.id === ach.id);

              return (
                <div
                  key={ach.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isUnlocked
                      ? 'bg-amber-950/20 border-amber-500/40 shadow-sm'
                      : 'bg-slate-950/40 border-slate-800/80 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      +{ach.pts} PTS
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white mt-2">{ach.title}</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{ach.desc}</p>
                  <div className="mt-3 flex items-center justify-between text-[11px]">
                    <span className={isUnlocked ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                      {isUnlocked ? 'Unlocked' : 'In Progress'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Community Leaderboard (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-5 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Medal className="w-4 h-4 text-purple-400" /> Community Recyclers Leaderboard
            </h3>
            <p className="text-xs text-slate-400">Opt-in rankings based on verified segregation actions</p>

            <div className="space-y-2">
              {leaderboard.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500">No community rankings recorded yet</div>
              ) : (
                leaderboard.slice(0, 5).map((entry, idx) => (
                  <div
                    key={entry.userId || idx}
                    className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0
                          ? 'bg-amber-500 text-slate-950'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-950'
                          : idx === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="text-xs font-medium text-white">{entry.name}</span>
                    </div>
                    <div className="font-mono text-xs font-bold text-emerald-400">
                      {entry.totalPoints} PTS
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-500 italic">
            Privacy safeguard: User participation in community leaderboards is opt-in and handles credentials securely.
          </div>
        </div>
      </div>

      {/* Interactive Recycling Intelligence Quiz */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-400" /> Circular Waste Intelligence Quiz
            </h3>
            <p className="text-xs text-slate-400">
              Test your knowledge of MRF sorting limitations, hazardous lithium risks, and food contamination.
            </p>
          </div>
          {quizResult && (
            <div className="text-right">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                quizResult.passed
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}>
                Score: {quizResult.score}/{quizResult.total} ({quizResult.percentage}%) {quizResult.passed ? '• Passed!' : '• Review Tips'}
              </span>
            </div>
          )}
        </div>

        {/* Questions list */}
        <div className="space-y-6">
          {(learningContent?.quiz || []).map((q: any, qIdx: number) => {
            const selectedOpt = quizAnswers[q.id];
            const graded = quizResult?.gradedAnswers?.find((g: any) => g.questionId === q.id);

            return (
              <div key={q.id} className="p-5 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30 uppercase">
                    {q.category}
                  </span>
                  <span className="text-xs text-slate-400">Question {qIdx + 1}</span>
                </div>
                <h4 className="text-sm font-semibold text-white">{q.question}</h4>

                {/* Options */}
                <div className="space-y-2 pt-1">
                  {q.options.map((opt: string, optIdx: number) => {
                    const isSelected = selectedOpt === optIdx;
                    let optStyle = 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700';

                    if (graded) {
                      if (graded.correct && isSelected) {
                        optStyle = 'bg-emerald-950/50 border-emerald-500 text-emerald-300 font-semibold';
                      } else if (!graded.correct && isSelected) {
                        optStyle = 'bg-rose-950/50 border-rose-500 text-rose-300';
                      }
                    } else if (isSelected) {
                      optStyle = 'bg-emerald-950/40 border-emerald-500 text-white font-medium';
                    }

                    return (
                      <button
                        key={optIdx}
                        onClick={() => handleSelectOption(q.id, optIdx)}
                        className={`w-full p-3 rounded-lg border text-left text-xs transition-all flex items-center justify-between ${optStyle}`}
                      >
                        <span>{opt}</span>
                        {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation on submit */}
                {graded && (
                  <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 text-xs text-slate-300 space-y-1">
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <Lightbulb className="w-3.5 h-3.5" /> Explanation:
                    </span>
                    <p className="leading-relaxed">{graded.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Submit Quiz Button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleSubmitQuiz}
            disabled={submittingQuiz}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-50"
          >
            {submittingQuiz ? 'Grading...' : 'Submit Quiz & Claim Points'}
          </button>
        </div>
      </div>
    </div>
  );
}
