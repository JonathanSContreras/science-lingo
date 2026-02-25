'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  FlaskConical, Flame, ChevronRight,
  CheckCircle2, XCircle, Lightbulb, Shield, Zap, X,
} from 'lucide-react'
import { recordAnswer, completeSession, purchasePowerUps } from './actions'

// ─── Types ──────────────────────────────────────────────────────────────────

type OptionKey = 'option_a' | 'option_b' | 'option_c' | 'option_d'

type Question = {
  id: string
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_option: string
  explanation: string
  hint: string | null
  order_index: number
}

type Topic = {
  id: string
  title: string
  description: string | null
  standard: string | null
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const
const OPTION_KEYS: OptionKey[] = ['option_a', 'option_b', 'option_c', 'option_d']
const COMPETITION_TIMER_SECS = 15

const POWER_UPS = [
  { id: 'fifty_fifty',   emoji: '🔍', name: '50/50',         cost: 75,  desc: 'Eliminate 2 wrong options on one question' },
  { id: 'hint_pass',     emoji: '💡', name: 'Hint Pass',     cost: 50,  desc: 'Unlock hints for all questions' },
  { id: 'streak_shield', emoji: '🛡️', name: 'Streak Shield', cost: 100, desc: 'Preserve your streak if you missed last week' },
]

// ─── Component ──────────────────────────────────────────────────────────────

type LessonCard = {
  id: string
  title: string
  body: string
}

export function QuizClient({
  sessionId,
  topic,
  questions,
  mode,
  studentXp,
  lessonCards = [],
}: {
  sessionId: string
  topic: Topic
  questions: Question[]
  mode: 'practice' | 'competition'
  studentXp: number
  lessonCards?: LessonCard[]
}) {
  const router = useRouter()
  const [confirmed, setConfirmed]           = useState(mode === 'practice')
  const [currentIndex, setCurrentIndex]     = useState(0)
  const [selectedOption, setSelectedOption] = useState<OptionKey | null>(null)
  const [hasAnswered, setHasAnswered]       = useState(false)
  const [correctAnswers, setCorrectAnswers] = useState(0)
  const [showHint, setShowHint]             = useState(false)
  const [isPending, startTransition]        = useTransition()

  // Competition timer
  const [timeLeft, setTimeLeft] = useState(COMPETITION_TIMER_SECS)

  // Power-up shop state (pre-purchase selections)
  const [selectedPowerUps, setSelectedPowerUps] = useState<string[]>([])

  // Power-up game state (set after purchase confirmed)
  const [purchasedPowerUps, setPurchasedPowerUps] = useState<string[]>([])
  const [fiftyFiftyUsed, setFiftyFiftyUsed]       = useState(false)
  const [eliminatedOptions, setEliminatedOptions] = useState<OptionKey[]>([])
  const [xpAfterPurchase, setXpAfterPurchase]     = useState(studentXp)

  // Lesson drawer
  const [lessonOpen, setLessonOpen] = useState(false)

  const currentQuestion = questions[currentIndex]
  const totalQuestions  = questions.length
  const isLastQuestion  = currentIndex === totalQuestions - 1
  const progressPercent = Math.round((currentIndex / totalQuestions) * 100)
  const correctKey      = `option_${currentQuestion.correct_option}` as OptionKey
  const isCorrect       = hasAnswered && selectedOption === correctKey

  // Shop cost calculation
  const totalCost   = selectedPowerUps.reduce((sum, id) => sum + (POWER_UPS.find((p) => p.id === id)?.cost ?? 0), 0)
  const xpRemaining = xpAfterPurchase - totalCost

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleSelectOption(key: OptionKey) {
    if (hasAnswered || isPending || eliminatedOptions.includes(key)) return
    setSelectedOption(key)
  }

  function handleFiftyFifty() {
    const wrongKeys = OPTION_KEYS.filter((k) => k !== correctKey)
    // Fisher-Yates shuffle, then take first 2
    for (let i = wrongKeys.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[wrongKeys[i], wrongKeys[j]] = [wrongKeys[j], wrongKeys[i]]
    }
    const toEliminate = wrongKeys.slice(0, 2)
    setEliminatedOptions(toEliminate)
    setFiftyFiftyUsed(true)
    // Clear selected option if it got eliminated
    if (selectedOption && toEliminate.includes(selectedOption)) {
      setSelectedOption(null)
    }
  }

  function handleReady() {
    if (selectedPowerUps.length > 0) {
      startTransition(async () => {
        const result = await purchasePowerUps(sessionId, selectedPowerUps)
        if ('newXp' in result) {
          setPurchasedPowerUps(selectedPowerUps)
          setXpAfterPurchase(result.newXp ?? studentXp)
        }
        setConfirmed(true)
      })
    } else {
      setConfirmed(true)
    }
  }

  // Practice: two-step — check answer → see feedback → next
  function handleCheckAnswer() {
    if (!selectedOption || hasAnswered || isPending) return
    const correct = selectedOption === correctKey
    setHasAnswered(true)
    setCorrectAnswers((c) => c + (correct ? 1 : 0))
    startTransition(async () => {
      await recordAnswer(sessionId, currentQuestion.id, selectedOption, correct)
    })
  }

  function handleNext() {
    if (isPending) return
    if (isLastQuestion) {
      startTransition(async () => {
        const result = await completeSession(sessionId, correctAnswers, totalQuestions)
        if (result.success) router.push(`/session/summary?session=${sessionId}`)
      })
    } else {
      setCurrentIndex((i) => i + 1)
      setSelectedOption(null)
      setHasAnswered(false)
      setShowHint(false)
    }
  }

  // Competition: single-step — submit → advance immediately, no feedback shown
  function handleSubmitCompetition() {
    if (!selectedOption || hasAnswered || isPending) return
    const correct    = selectedOption === correctKey
    const newCorrect = correctAnswers + (correct ? 1 : 0)
    setHasAnswered(true)
    startTransition(async () => {
      await recordAnswer(sessionId, currentQuestion.id, selectedOption, correct)
      if (isLastQuestion) {
        const result = await completeSession(sessionId, newCorrect, totalQuestions)
        if (result.success) router.push(`/session/summary?session=${sessionId}`)
      } else {
        setCorrectAnswers(newCorrect)
        setCurrentIndex((i) => i + 1)
        setSelectedOption(null)
        setHasAnswered(false)
        setShowHint(false)
        setEliminatedOptions([])
      }
    })
  }

  // ── Competition timer ──────────────────────────────────────────────────────

  // Reset timer when advancing to the next question
  useEffect(() => {
    if (mode === 'competition' && confirmed) setTimeLeft(COMPETITION_TIMER_SECS)
  }, [currentIndex, mode, confirmed])

  // Count down one second at a time (stops when answered or time runs out)
  useEffect(() => {
    if (mode !== 'competition' || !confirmed || hasAnswered || timeLeft <= 0) return
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearTimeout(id)
  }, [mode, confirmed, hasAnswered, timeLeft])

  // Auto-submit a wrong answer when the clock hits 0
  useEffect(() => {
    if (mode !== 'competition' || !confirmed || timeLeft !== 0 || hasAnswered || isPending) return
    const wrongKey = (OPTION_KEYS.find((k) => k !== correctKey) ?? 'option_a') as OptionKey
    setHasAnswered(true)
    startTransition(async () => {
      await recordAnswer(sessionId, currentQuestion.id, wrongKey, false)
      if (isLastQuestion) {
        const result = await completeSession(sessionId, correctAnswers, totalQuestions)
        if (result.success) router.push(`/session/summary?session=${sessionId}`)
      } else {
        setCurrentIndex((i) => i + 1)
        setSelectedOption(null)
        setHasAnswered(false)
        setShowHint(false)
        setEliminatedOptions([])
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, mode, confirmed, hasAnswered, isPending])

  // ── Option styling ─────────────────────────────────────────────────────────

  function getOptionClass(key: OptionKey) {
    const base = 'w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-200 text-left'
    // Eliminated by 50/50
    if (eliminatedOptions.includes(key)) {
      return `${base} border-slate-800/30 bg-slate-900/30 text-slate-700 line-through cursor-not-allowed`
    }
    if (!hasAnswered) {
      return `${base} ${
        selectedOption === key
          ? 'border-teal-500 bg-teal-500/15 text-white shadow-sm shadow-teal-500/20'
          : 'border-slate-700/60 bg-slate-800/50 text-slate-300 hover:border-slate-600 hover:bg-slate-800 active:scale-[0.99]'
      }`
    }
    if (mode === 'practice') {
      if (key === correctKey)    return `${base} border-emerald-500 bg-emerald-500/15 text-emerald-200`
      if (key === selectedOption) return `${base} border-red-500 bg-red-500/15 text-red-300`
      return `${base} border-slate-700/30 bg-slate-800/30 text-slate-600`
    }
    // Competition: lock without revealing correct answer
    if (key === selectedOption) return `${base} border-teal-500/40 bg-teal-500/8 text-slate-400`
    return `${base} border-slate-700/30 bg-slate-800/30 text-slate-600`
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  // Competition confirmation + power-up shop screen
  if (!confirmed) {
    return (
      <main className="min-h-screen bg-[#060c18] flex flex-col items-center justify-center p-6 max-w-lg mx-auto">
        <div className="w-full max-w-sm">

          {/* Header */}
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">🏆</div>
            <h1 className="text-2xl font-black text-white mb-1">Competition Round</h1>
            <p className="text-slate-400 text-sm mb-3">{topic.title}</p>
            <div className="inline-flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-sm font-bold px-3 py-1.5 rounded-full">
              <Zap size={14} />
              {xpAfterPurchase.toLocaleString()} XP
            </div>
          </div>

          {/* Rules */}
          <div className="bg-slate-900/80 border border-amber-500/25 rounded-2xl p-4 mb-5 space-y-2.5 text-left">
            <div className="flex items-start gap-3">
              <span className="text-base mt-0.5">⚠️</span>
              <p className="text-xs text-slate-300 leading-relaxed">
                <span className="font-black text-amber-400">You can only take this once.</span>{' '}
                Your score will be locked and ranked on the leaderboard.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-base mt-0.5">⏱️</span>
              <p className="text-xs text-slate-300 leading-relaxed">
                <span className="font-black text-amber-400">{COMPETITION_TIMER_SECS} seconds per question.</span>{' '}
                Unanswered questions are marked wrong.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-base mt-0.5">🔀</span>
              <p className="text-xs text-slate-300 leading-relaxed">Questions are in a randomized order.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-base mt-0.5">🚫</span>
              <p className="text-xs text-slate-300 leading-relaxed">No feedback shown during the round.</p>
            </div>
          </div>

          {/* Power-up shop */}
          <div className="mb-5">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Power-Ups</h2>
            <div className="space-y-2.5">
              {POWER_UPS.map((pu) => {
                const isSelected = selectedPowerUps.includes(pu.id)
                const canSelect  = isSelected || xpAfterPurchase - totalCost >= pu.cost
                return (
                  <button
                    key={pu.id}
                    onClick={() =>
                      canSelect &&
                      setSelectedPowerUps((prev) =>
                        prev.includes(pu.id)
                          ? prev.filter((p) => p !== pu.id)
                          : [...prev, pu.id],
                      )
                    }
                    disabled={!canSelect}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 text-white'
                        : canSelect
                          ? 'border-slate-700/60 bg-slate-800/50 text-slate-300 hover:border-slate-600 active:scale-[0.99]'
                          : 'border-slate-800/40 bg-slate-900/30 text-slate-600 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <span className="text-2xl">{pu.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold">{pu.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5 leading-snug">{pu.desc}</div>
                    </div>
                    <div className={`flex items-center gap-0.5 text-xs font-black flex-shrink-0 ${isSelected ? 'text-amber-400' : 'text-slate-500'}`}>
                      <Zap size={11} />
                      {pu.cost}
                    </div>
                    {isSelected && <CheckCircle2 size={16} className="text-amber-400 flex-shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Cost summary */}
          {totalCost > 0 && (
            <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl px-4 py-2.5 mb-4 flex items-center justify-between text-xs">
              <span className="text-slate-500">Total cost</span>
              <span className="font-black text-amber-400 flex items-center gap-0.5">
                <Zap size={10} /> {totalCost} XP
              </span>
              <span className="text-slate-600 mx-1">→</span>
              <span className={`font-black flex items-center gap-0.5 ${xpRemaining >= 0 ? 'text-white' : 'text-red-400'}`}>
                <Zap size={10} /> {xpRemaining} left
              </span>
            </div>
          )}

          <button
            onClick={handleReady}
            disabled={isPending}
            className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] disabled:opacity-40 text-slate-900 font-black text-base transition-all shadow-lg shadow-amber-500/20 mb-3"
          >
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                Purchasing…
              </span>
            ) : totalCost > 0 ? (
              'Buy & Start 🚀'
            ) : (
              "I'm Ready — Let's Go 🚀"
            )}
          </button>
          <a
            href="/dashboard"
            className="block text-sm text-center text-slate-600 hover:text-slate-400 transition-colors py-2"
          >
            Not ready yet — go back
          </a>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#060c18] flex flex-col max-w-lg mx-auto">

      {/* ── Header ── */}
      <header className="px-4 pt-6 pb-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FlaskConical size={16} className="text-teal-400 flex-shrink-0" />
          <span className="text-sm font-bold text-teal-400 truncate">{topic.title}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          {mode === 'competition' && (
            <div className="flex items-center gap-1 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold px-2 py-1 rounded-lg">
              <Shield size={11} />
              Competition
            </div>
          )}
          <div className="flex items-center gap-1.5 text-orange-400">
            <Flame size={15} />
            <span className="text-xs font-black">{currentIndex + 1}/{totalQuestions}</span>
          </div>
        </div>
      </header>

      {/* ── Progress bar ── */}
      <div className="px-4 pt-2 pb-4 flex-shrink-0">
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-500 to-cyan-400 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* ── Competition timer bar ── */}
      {mode === 'competition' && (
        <div className="px-4 pb-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Time</span>
            <span className={`text-sm font-black tabular-nums transition-colors duration-300 ${
              hasAnswered ? 'text-slate-700' : timeLeft <= 5 ? 'text-red-400' : timeLeft <= 10 ? 'text-amber-400' : 'text-slate-500'
            }`}>
              {hasAnswered ? '✓' : `${timeLeft}s`}
            </span>
          </div>
          <div className="h-1.5 bg-slate-800/80 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${
                hasAnswered ? 'bg-slate-700' : timeLeft <= 5 ? 'bg-red-500' : timeLeft <= 10 ? 'bg-amber-500' : 'bg-teal-500'
              }`}
              style={{ width: hasAnswered ? '100%' : `${(timeLeft / COMPETITION_TIMER_SECS) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">

        {/* Question card */}
        <div className="bg-slate-900/80 border border-slate-700/50 rounded-3xl p-5 shadow-xl">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-3">
            Question {currentIndex + 1}
          </p>
          <p className="text-white font-semibold text-lg leading-snug">
            {currentQuestion.question_text}
          </p>

          {/* Hint — practice or hint_pass power-up */}
          {(mode === 'practice' || purchasedPowerUps.includes('hint_pass')) &&
            currentQuestion.hint &&
            !hasAnswered && (
            <div className="mt-4">
              {!showHint ? (
                <button
                  onClick={() => setShowHint(true)}
                  className="flex items-center gap-1.5 text-xs text-amber-400/60 hover:text-amber-400 transition-colors"
                >
                  <Lightbulb size={13} />
                  Tap for a hint
                </button>
              ) : (
                <div className="flex items-start gap-2 mt-1 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5">
                  <Lightbulb size={13} className="text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-300 leading-relaxed">{currentQuestion.hint}</p>
                </div>
              )}
            </div>
          )}

          {/* 50/50 button — competition power-up, one-time use */}
          {mode === 'competition' &&
            purchasedPowerUps.includes('fifty_fifty') &&
            !fiftyFiftyUsed &&
            !hasAnswered && (
            <div className="mt-3">
              <button
                onClick={handleFiftyFifty}
                className="flex items-center gap-1.5 text-xs text-violet-400/70 hover:text-violet-400 transition-colors font-medium"
              >
                🔍 Use 50/50
              </button>
            </div>
          )}
        </div>

        {/* Answer options */}
        <div className="space-y-2.5">
          {OPTION_KEYS.map((key, i) => (
            <button
              key={key}
              onClick={() => handleSelectOption(key)}
              disabled={hasAnswered || isPending || eliminatedOptions.includes(key)}
              className={getOptionClass(key)}
            >
              <span className="w-8 h-8 rounded-xl bg-slate-700/70 flex items-center justify-center text-xs font-black flex-shrink-0">
                {OPTION_LABELS[i]}
              </span>
              <span className={`text-sm font-medium leading-snug flex-1 ${eliminatedOptions.includes(key) ? 'line-through opacity-50' : ''}`}>
                {currentQuestion[key]}
              </span>
              {/* Icons — practice only */}
              {mode === 'practice' && hasAnswered && key === correctKey && (
                <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
              )}
              {mode === 'practice' && hasAnswered && key === selectedOption && key !== correctKey && (
                <XCircle size={18} className="text-red-400 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>

        {/* Feedback — practice only */}
        {mode === 'practice' && hasAnswered && (
          <div className={`rounded-2xl px-4 py-4 border ${
            isCorrect
              ? 'bg-emerald-500/10 border-emerald-500/25'
              : 'bg-red-500/10 border-red-500/20'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {isCorrect ? (
                <>
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <span className="text-sm font-black text-emerald-400">Correct! 🎉</span>
                </>
              ) : (
                <>
                  <XCircle size={16} className="text-red-400" />
                  <span className="text-sm font-black text-red-400">Not quite!</span>
                </>
              )}
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              {currentQuestion.explanation}
            </p>
          </div>
        )}

      </div>

      {/* ── Floating lesson button ── */}
      {lessonCards.length > 0 && (
        <button
          onClick={() => setLessonOpen(true)}
          className="fixed bottom-24 left-4 z-40 flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-slate-300 text-xs font-bold px-3 py-2.5 rounded-2xl shadow-lg transition-all active:scale-95"
          aria-label="Open lesson"
        >
          📖 Lesson
        </button>
      )}

      {/* ── Lesson drawer ── */}
      {lessonOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="flex-1 bg-black/50"
            onClick={() => setLessonOpen(false)}
          />
          {/* Panel */}
          <div className="w-full max-w-sm bg-[#0d1526] border-l border-slate-800 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 flex-shrink-0">
              <div>
                <p className="text-xs font-bold text-teal-400 uppercase tracking-widest">Lesson</p>
                <p className="text-sm font-black text-white">{topic.title}</p>
              </div>
              <button
                onClick={() => setLessonOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition-all"
                aria-label="Close lesson"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {lessonCards.map((card) => (
                <div
                  key={card.id}
                  className="bg-slate-800/60 border border-slate-700/40 rounded-2xl p-4"
                >
                  <p className="text-sm font-black text-teal-300 mb-2">{card.title}</p>
                  <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">{card.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Sticky bottom CTA ── */}
      <div className="px-4 pt-3 pb-8 flex-shrink-0 border-t border-slate-800/60 bg-[#060c18]">

        {mode === 'practice' ? (
          // Practice: two-step flow
          !hasAnswered ? (
            <button
              onClick={handleCheckAnswer}
              disabled={!selectedOption || isPending}
              className="w-full py-4 rounded-2xl bg-teal-500 hover:bg-teal-400 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 font-black text-base transition-all shadow-lg shadow-teal-500/20"
            >
              Check Answer
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={isPending}
              className="w-full py-4 rounded-2xl bg-teal-500 hover:bg-teal-400 active:scale-[0.98] disabled:opacity-60 text-slate-900 font-black text-base transition-all shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                  {isLastQuestion ? 'Finishing…' : 'Saving…'}
                </span>
              ) : (
                <>
                  {isLastQuestion ? 'See Results 🎉' : 'Next Question'}
                  {!isLastQuestion && <ChevronRight size={18} />}
                </>
              )}
            </button>
          )
        ) : (
          // Competition: single-step — submit & advance, no feedback
          <button
            onClick={handleSubmitCompetition}
            disabled={!selectedOption || isPending}
            className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 font-black text-base transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                {isLastQuestion ? 'Finishing…' : 'Submitting…'}
              </span>
            ) : (
              <>
                {isLastQuestion ? 'Finish Competition 🏆' : 'Submit Answer'}
                {!isLastQuestion && <ChevronRight size={18} />}
              </>
            )}
          </button>
        )}

      </div>

    </main>
  )
}
