'use client'

import { useState, useTransition } from 'react'
import { updateCompetitionLimit } from '../actions'

export function CompetitionLimitForm({
  topicId,
  currentLimit,
  poolSize,
}: {
  topicId:      string
  currentLimit: number | null
  poolSize:     number
}) {
  const [value, setValue]     = useState(currentLimit?.toString() ?? '')
  const [saved, setSaved]     = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    const limit   = trimmed === '' ? null : parseInt(trimmed, 10)
    if (limit !== null && (isNaN(limit) || limit < 1)) return
    startTransition(async () => {
      await updateCompetitionLimit(topicId, limit)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <div className="flex-1">
        <input
          type="number"
          min={1}
          max={poolSize}
          value={value}
          onChange={(e) => { setValue(e.target.value); setSaved(false) }}
          placeholder={`All (${poolSize})`}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500/60 transition-colors"
        />
        <p className="text-xs text-slate-600 mt-1.5">
          Leave blank to use all {poolSize} question{poolSize !== 1 ? 's' : ''}
        </p>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 active:scale-95 disabled:opacity-50 text-slate-900 font-bold text-sm transition-all"
      >
        {saved ? '✓ Saved' : isPending ? 'Saving…' : 'Save'}
      </button>
    </form>
  )
}
