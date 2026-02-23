'use client'

import { useTransition } from 'react'
import { deleteQuestion } from '../actions'
import { Trash2 } from 'lucide-react'

export function DeleteQuestionButton({
  questionId,
  topicId,
}: {
  questionId: string
  topicId: string
}) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm('Delete this question?')) return
    startTransition(async () => {
      await deleteQuestion(questionId, topicId)
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="text-slate-600 hover:text-red-400 disabled:opacity-40 transition-colors flex-shrink-0 p-1"
      title="Delete question"
    >
      <Trash2 size={14} />
    </button>
  )
}
