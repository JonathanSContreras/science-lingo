'use client'

import { useState, useTransition } from 'react'
import { createTopic } from './actions'
import { Zap } from 'lucide-react'

export function CreateTopicForm() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    const formData = new FormData(e.currentTarget)
    const form = e.currentTarget
    startTransition(async () => {
      const result = await createTopic(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        form.reset()
        setTimeout(() => setSuccess(false), 3000)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} suppressHydrationWarning className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Title *
          </label>
          <input
            name="title"
            type="text"
            required
            placeholder="e.g. Plate Tectonics"
            className="w-full bg-slate-800/80 border border-slate-700/60 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500/60 transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Standard
          </label>
          <input
            name="standard"
            type="text"
            placeholder="e.g. 7.10ab"
            className="w-full bg-slate-800/80 border border-slate-700/60 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500/60 transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Week #
          </label>
          <input
            name="week_number"
            type="number"
            min="1"
            placeholder="e.g. 5"
            className="w-full bg-slate-800/80 border border-slate-700/60 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500/60 transition-all"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Description (shown to students)
          </label>
          <textarea
            name="description"
            rows={2}
            placeholder="A quick 2–3 sentence intro students see before starting..."
            className="w-full bg-slate-800/80 border border-slate-700/60 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500/60 transition-all resize-none"
          />
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
          {error}
        </p>
      )}
      {success && (
        <p className="text-xs text-teal-400 bg-teal-500/10 border border-teal-500/20 rounded-xl px-3 py-2">
          ✓ Topic created! Now add questions to it below.
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 disabled:opacity-60 text-slate-900 font-black text-sm px-5 py-2.5 rounded-xl transition-all"
      >
        <Zap size={14} className="fill-slate-900" />
        {isPending ? 'Creating…' : 'Create Topic'}
      </button>
    </form>
  )
}
