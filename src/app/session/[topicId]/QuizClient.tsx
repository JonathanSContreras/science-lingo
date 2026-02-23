'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  FlaskConical, Flame, ChevronRight,
  CheckCircle2, XCircle, Lightbulb,
} from 'lucide-react'
import { recordAnswer, completeSession } from './actions'
import { ChatBot } from './ChatBot'
import { MiniLesson } from './MiniLesson'

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

// ─── Component ──────────────────────────────────────────────────────────────

export function QuizClient({
  sessionId,
  topic,
  questions,
}: {
  sessionId: string
  topic: Topic
  questions: Question[]
})
 {
  const router = useRouter()
  const [phase, setPhase]                   = useState<'lesson' | 'quiz'>('lesson')
  const [currentIndex, setCurrentIndex]     = useState(0)
  const [selectedOption, setSelectedOption] = useState<OptionKey | null>(null)
  const [hasAnswered, setHasAnswered]       = useState(false)
  const [correctAnswers, setCorrectAnswers] = useState(0)
  const [showHint, setShowHint]             = useState(false)
  const [isPending, startTransition]        = useTransition()

  const currentQuestion  = questions[currentIndex]
  const totalQuestions   = questions.length
  const isLastQuestion   = currentIndex === totalQuestions - 1
  const progressPercent  = Math.round((currentIndex / totalQuestions) * 100)
  const correctKey       = `option_${currentQuestion.correct_option}` as OptionKey
  const isCorrect        = hasAnswered && selectedOption === correctKey

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleSelectOption(key: OptionKey) {
    if (hasAnswered) return
    setSelectedOption(key)
  }

  function handleCheckAnswer() {
    if (!selectedOption || hasAnswered || isPending) return

    const correct        = selectedOption === correctKey
    const newCorrectCount = correctAnswers + (correct ? 1 : 0)

    setHasAnswered(true)
    setCorrectAnswers(newCorrectCount)

    // Fire-and-forget: record in DB; "Next" button is disabled while pending
    startTransition(async () => {
      await recordAnswer(sessionId, currentQuestion.id, selectedOption, correct)
    })
  }

  function handleNext() {
    if (isPending) return

    if (isLastQuestion) {
      // Complete session — correctAnswers already includes the last answer
      startTransition(async () => {
        const result = await completeSession(sessionId, correctAnswers, totalQuestions)
        if (result.success) {
          router.push(`/session/summary?session=${sessionId}`)
        }
      })
    } else {
      setCurrentIndex((i) => i + 1)
      setSelectedOption(null)
      setHasAnswered(false)
      setShowHint(false)
    }
  }

  // ── Option styling ─────────────────────────────────────────────────────────

  function getOptionClass(key: OptionKey) {
    const base = 'w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-200 text-left'
    if (!hasAnswered) {
      return `${base} ${
        selectedOption === key
          ? 'border-teal-500 bg-teal-500/15 text-white shadow-sm shadow-teal-500/20'
          : 'border-slate-700/60 bg-slate-800/50 text-slate-300 hover:border-slate-600 hover:bg-slate-800 active:scale-[0.99]'
      }`
    }
    if (key === correctKey)
      return `${base} border-emerald-500 bg-emerald-500/15 text-emerald-200`
    if (key === selectedOption)
      return `${base} border-red-500 bg-red-500/15 text-red-300`
    return `${base} border-slate-700/30 bg-slate-800/30 text-slate-600`
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  // if (phase === 'lesson') {
  //   return (
  //     <MiniLesson
  //       topic={topic}
  //       onComplete={() => setPhase('quiz')}
  //     />
  //   )
  // }

  return (
    <main className="min-h-screen bg-[#060c18] flex flex-col max-w-lg mx-auto">

      {/* ── Header ── */}
      <header className="px-4 pt-6 pb-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FlaskConical size={16} className="text-teal-400 flex-shrink-0" />
          <span className="text-sm font-bold text-teal-400 truncate">{topic.title}</span>
        </div>
        <div className="flex items-center gap-1.5 text-orange-400 flex-shrink-0 ml-3">
          <Flame size={15} />
          <span className="text-xs font-black">{currentIndex + 1}/{totalQuestions}</span>
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

          {/* Hint */}
          {currentQuestion.hint && !hasAnswered && (
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
        </div>

        {/* Answer options */}
        <div className="space-y-2.5">
          {OPTION_KEYS.map((key, i) => (
            <button
              key={key}
              onClick={() => handleSelectOption(key)}
              disabled={hasAnswered}
              className={getOptionClass(key)}
            >
              {/* Label bubble */}
              <span className="w-8 h-8 rounded-xl bg-slate-700/70 flex items-center justify-center text-xs font-black flex-shrink-0">
                {OPTION_LABELS[i]}
              </span>

              {/* Text */}
              <span className="text-sm font-medium leading-snug flex-1">
                {currentQuestion[key]}
              </span>

              {/* Status icon */}
              {hasAnswered && key === correctKey && (
                <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
              )}
              {hasAnswered && key === selectedOption && key !== correctKey && (
                <XCircle size={18} className="text-red-400 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>

        {/* Feedback panel */}
        {hasAnswered && (
          <div
            className={`rounded-2xl px-4 py-4 border ${
              isCorrect
                ? 'bg-emerald-500/10 border-emerald-500/25'
                : 'bg-red-500/10 border-red-500/20'
            }`}
          >
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

      {/* ── Sticky bottom CTA ── */}
      <div className="px-4 pt-3 pb-8 flex-shrink-0 border-t border-slate-800/60 bg-[#060c18]">
        {!hasAnswered ? (
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
        )}
      </div>

      {/* ── AI Chatbot (floating, topic-scoped) ── */}
      {/* <ChatBot
        topicTitle={topic.title}
        topicDescription={topic.description}
      /> */}

    </main>
  )
}
