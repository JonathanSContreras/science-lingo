'use client'

import { useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteLessonCard } from '../actions'

export function LessonCardItem({
  card,
  topicId,
}: {
  card: { id: string; title: string; body: string; order_index: number }
  topicId: string
}) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      await deleteLessonCard(card.id, topicId)
    })
  }

  return (
    <div className="flex items-start gap-3 bg-slate-800/40 border border-slate-700/40 rounded-2xl p-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black text-white mb-1">{card.title}</p>
        <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">{card.body}</p>
      </div>
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="flex-shrink-0 p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-40 transition-all"
        title="Delete card"
      >
        {isPending ? (
          <span className="w-4 h-4 border-2 border-slate-600/30 border-t-slate-400 rounded-full animate-spin block" />
        ) : (
          <Trash2 size={15} />
        )}
      </button>
    </div>
  )
}
