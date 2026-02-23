'use client'

import { useState } from 'react'
import { CheckCircle, Pencil } from 'lucide-react'
import { DeleteQuestionButton } from './DeleteQuestionButton'
import { EditQuestionForm } from './EditQuestionForm'

const OPTION_LABELS = ['A', 'B', 'C', 'D']

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

export function QuestionCard({
  question,
  index,
  topicId,
}: {
  question: Question
  index: number
  topicId: string
}) {
  const [isEditing, setIsEditing] = useState(false)

  if (isEditing) {
    return (
      <div className="border border-teal-500/30 bg-teal-500/5 rounded-2xl p-4">
        <p className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-3">
          Editing Q{index + 1}
        </p>
        <EditQuestionForm
          question={question}
          topicId={topicId}
          onCancel={() => setIsEditing(false)}
          onSaved={() => setIsEditing(false)}
        />
      </div>
    )
  }

  return (
    <div className="border border-slate-800 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <span className="text-xs font-bold text-slate-500 mt-0.5 flex-shrink-0">
            Q{index + 1}
          </span>
          <p className="text-sm font-semibold text-white leading-snug">
            {question.question_text}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setIsEditing(true)}
            className="text-slate-600 hover:text-teal-400 transition-colors p-1"
            title="Edit question"
          >
            <Pencil size={14} />
          </button>
          <DeleteQuestionButton questionId={question.id} topicId={topicId} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5 mb-3">
        {(['a', 'b', 'c', 'd'] as const).map((opt, idx) => (
          <div
            key={opt}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${
              question.correct_option === opt
                ? 'bg-teal-500/15 border border-teal-500/30 text-teal-300'
                : 'bg-slate-800/60 text-slate-400'
            }`}
          >
            {question.correct_option === opt && (
              <CheckCircle size={11} className="text-teal-400 flex-shrink-0" />
            )}
            <span className="font-bold text-slate-500 flex-shrink-0">{OPTION_LABELS[idx]}.</span>
            <span className="truncate">{question[`option_${opt}`]}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500 italic leading-snug">
        💡 {question.explanation}
      </p>
    </div>
  )
}
