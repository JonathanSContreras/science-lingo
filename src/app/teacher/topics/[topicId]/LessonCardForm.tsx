'use client'

import { useState, useTransition } from 'react'
import { addLessonCard } from '../actions'

export function LessonCardForm({
  topicId,
  nextOrderIndex,
}: {
  topicId: string
  nextOrderIndex: number
}) {
  const [title, setTitle]   = useState('')
  const [body, setBody]     = useState('')
  const [status, setStatus] = useState<'idle' | 'ok' | 'err'>('idle')
  const [errMsg, setErrMsg] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return
    setStatus('idle')
    startTransition(async () => {
      const result = await addLessonCard(topicId, title.trim(), body.trim(), nextOrderIndex)
      if ('error' in result && result.error) {
        setErrMsg(result.error)
        setStatus('err')
      } else {
        setStatus('ok')
        setTitle('')
        setBody('')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Card title (e.g. What is a tectonic plate?)"
        required
        className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500/60"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Card body — explain the concept in plain language"
        required
        rows={4}
        className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500/60 resize-none"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending || !title.trim() || !body.trim()}
          className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-40 text-slate-900 font-black text-sm transition-all"
        >
          {isPending ? 'Adding…' : 'Add Card'}
        </button>
        {status === 'ok' && (
          <span className="text-xs text-emerald-400 font-semibold">Card added ✓</span>
        )}
        {status === 'err' && (
          <span className="text-xs text-red-400">{errMsg}</span>
        )}
      </div>
    </form>
  )
}
