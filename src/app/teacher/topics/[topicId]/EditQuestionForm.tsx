'use client'

import { useState, useTransition } from 'react'
import { updateQuestion } from '../actions'
import { Check, X } from 'lucide-react'

const OPTIONS = ['a', 'b', 'c', 'd'] as const
const LABELS  = { a: 'A', b: 'B', c: 'C', d: 'D' }

type Question = {
  id: string
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_option: string
  explanation: string
  hint?: string | null
}

export function EditQuestionForm({
  question,
  topicId,
  onCancel,
  onSaved,
}: {
  question: Question
  topicId: string
  onCancel: () => void
  onSaved: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [correct, setCorrect] = useState<'a' | 'b' | 'c' | 'd'>(
    question.correct_option as 'a' | 'b' | 'c' | 'd'
  )

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set('correct_option', correct)

    startTransition(async () => {
      const result = await updateQuestion(question.id, topicId, formData)
      if (result?.error) {
        setError(result.error)
      } else {
        onSaved()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Question */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
          Question *
        </label>
        <textarea
          name="question_text"
          required
          rows={2}
          defaultValue={question.question_text}
          className="w-full bg-slate-800/80 border border-slate-700/60 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500/60 transition-all resize-none"
        />
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {OPTIONS.map((opt) => (
          <div key={opt}>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Option {LABELS[opt]} *
            </label>
            <div className="relative flex items-center">
              <input
                name={`option_${opt}`}
                type="text"
                required
                defaultValue={question[`option_${opt}`]}
                className={`w-full bg-slate-800/80 border rounded-xl pl-4 pr-10 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none transition-all ${
                  correct === opt
                    ? 'border-teal-500/60 bg-teal-500/5'
                    : 'border-slate-700/60 focus:border-teal-500/40'
                }`}
              />
              <button
                type="button"
                onClick={() => setCorrect(opt)}
                title="Mark as correct answer"
                className={`absolute right-2.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                  correct === opt
                    ? 'border-teal-500 bg-teal-500'
                    : 'border-slate-600 hover:border-teal-500/60'
                }`}
              >
                {correct === opt && (
                  <span className="text-slate-900 text-xs font-black">✓</span>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500">
        Click the circle next to the correct answer —{' '}
        <span className="text-teal-400 font-semibold">Option {LABELS[correct]}</span> is marked correct.
      </p>

      {/* Explanation */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
          Explanation *{' '}
          <span className="normal-case font-normal text-slate-600">(shown after answering)</span>
        </label>
        <textarea
          name="explanation"
          required
          rows={2}
          defaultValue={question.explanation}
          className="w-full bg-slate-800/80 border border-slate-700/60 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500/60 transition-all resize-none"
        />
      </div>

      {/* Hint */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
          Hint <span className="normal-case font-normal text-slate-600">(optional)</span>
        </label>
        <input
          name="hint"
          type="text"
          defaultValue={question.hint ?? ''}
          className="w-full bg-slate-800/80 border border-slate-700/60 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500/60 transition-all"
        />
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 disabled:opacity-60 text-slate-900 font-black text-sm px-5 py-2.5 rounded-xl transition-all"
        >
          <Check size={14} />
          {isPending ? 'Saving…' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="flex items-center gap-2 text-slate-400 hover:text-white disabled:opacity-40 font-semibold text-sm px-4 py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 transition-all"
        >
          <X size={14} />
          Cancel
        </button>
      </div>
    </form>
  )
}
