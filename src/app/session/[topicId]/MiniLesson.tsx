'use client'

import { useEffect, useState } from 'react'
import { FlaskConical, ChevronRight, Zap } from 'lucide-react'
import type { LessonContent } from '@/app/api/lesson/route'

type Topic = {
  title: string
  description: string | null
  standard: string | null
}

type Props = {
  topic: Topic
  onComplete: () => void
}

export function MiniLesson({ topic, onComplete }: Props) {
  const [lesson, setLesson]   = useState<LessonContent | null>(null)
  const [error, setError]     = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchLesson() {
      try {
        const res = await fetch('/api/lesson', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topicTitle:       topic.title,
            topicDescription: topic.description,
            standard:         topic.standard,
          }),
        })

        if (!res.ok) throw new Error('Failed to fetch lesson')
        const data = await res.json()
        if (!cancelled) setLesson(data.lesson)
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchLesson()
    return () => { cancelled = true }
  }, [topic])

  // ── Loading skeleton ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="min-h-screen bg-[#060c18] flex flex-col max-w-lg mx-auto px-4 pt-8 pb-8">
        <LessonHeader title={topic.title} />
        <div className="flex-1 space-y-4 mt-6 animate-pulse">
          <div className="h-20 bg-slate-800/70 rounded-2xl" />
          <div className="h-36 bg-slate-800/50 rounded-2xl" />
          <div className="h-36 bg-slate-800/50 rounded-2xl" />
          <div className="h-36 bg-slate-800/50 rounded-2xl" />
        </div>
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500 animate-pulse">Preparing your lesson…</p>
        </div>
      </main>
    )
  }

  // ── Error fallback — let them skip straight to quiz ──────────────────────────

  if (error || !lesson) {
    return (
      <main className="min-h-screen bg-[#060c18] flex flex-col items-center justify-center max-w-lg mx-auto px-4 text-center gap-6">
        <FlaskConical size={40} className="text-teal-400" />
        <div>
          <p className="text-white font-bold text-lg mb-1">Couldn't load the mini lesson</p>
          <p className="text-slate-400 text-sm">No worries — jump straight into the questions.</p>
        </div>
        <button
          onClick={onComplete}
          className="w-full max-w-xs py-4 rounded-2xl bg-teal-500 hover:bg-teal-400 active:scale-[0.98] text-slate-900 font-black text-base transition-all shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2"
        >
          Start Quiz <ChevronRight size={18} />
        </button>
      </main>
    )
  }

  // ── Lesson view ──────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[#060c18] flex flex-col max-w-lg mx-auto">

      {/* ── Header ── */}
      <header className="px-4 pt-6 pb-4 flex-shrink-0">
        <LessonHeader title={topic.title} />
      </header>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">

        {/* Hook card */}
        <div className="bg-gradient-to-br from-teal-500/20 to-cyan-500/10 border border-teal-500/30 rounded-3xl px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={14} className="text-teal-400" />
            <span className="text-xs font-black text-teal-400 uppercase tracking-wider">Quick Brief</span>
          </div>
          <p className="text-white font-semibold text-base leading-snug">
            {lesson.hook}
          </p>
        </div>

        {/* Concept cards */}
        {lesson.concepts.map((concept, i) => (
          <div
            key={i}
            className="bg-slate-900/80 border border-slate-700/50 rounded-3xl px-5 py-4 shadow-lg"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl leading-none mt-0.5 flex-shrink-0">{concept.emoji}</span>
              <div className="min-w-0">
                <p className="text-sm font-black text-teal-300 mb-1.5">{concept.title}</p>
                <p className="text-sm text-slate-300 leading-relaxed">{concept.explanation}</p>
              </div>
            </div>
          </div>
        ))}

        {/* Quick tip */}
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl px-4 py-3 flex items-start gap-2.5">
          <span className="text-lg flex-shrink-0">💡</span>
          <div>
            <p className="text-xs font-black text-amber-400 uppercase tracking-wider mb-1">Quiz Tip</p>
            <p className="text-sm text-amber-200/80 leading-relaxed">{lesson.quickTip}</p>
          </div>
        </div>

      </div>

      {/* ── Sticky CTA ── */}
      <div className="px-4 pt-3 pb-8 flex-shrink-0 border-t border-slate-800/60 bg-[#060c18]">
        <button
          onClick={onComplete}
          className="w-full py-4 rounded-2xl bg-teal-500 hover:bg-teal-400 active:scale-[0.98] text-slate-900 font-black text-base transition-all shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2"
        >
          I'm Ready — Start Quiz
          <ChevronRight size={18} />
        </button>
      </div>

    </main>
  )
}

// ─── Shared header ────────────────────────────────────────────────────────────

function LessonHeader({ title }: { title: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <FlaskConical size={15} className="text-teal-400" />
        <span className="text-xs font-black text-teal-400 uppercase tracking-wider">Mini Lesson</span>
      </div>
      <h1 className="text-xl font-black text-white leading-tight">{title}</h1>
    </div>
  )
}
