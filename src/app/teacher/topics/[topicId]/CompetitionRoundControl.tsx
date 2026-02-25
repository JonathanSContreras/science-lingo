'use client'

import { useTransition } from 'react'
import { openCompetition, closeCompetition } from '../actions'

interface Props {
  topicId: string
  isOpen: boolean
  round: number
}

export function CompetitionRoundControl({ topicId, isOpen, round }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleOpen() {
    startTransition(async () => {
      await openCompetition(topicId)
    })
  }

  function handleClose() {
    startTransition(async () => {
      await closeCompetition(topicId)
    })
  }

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5">
      <h2 className="text-xs font-black uppercase tracking-wider mb-1 text-violet-400">
        Competition Round
      </h2>
      <p className="text-xs text-slate-500 mb-4">
        Open a round to let students compete. Each new round resets eligibility — students who
        competed in a prior round can compete again.
      </p>

      <div className="flex items-center justify-between gap-4">
        {/* Status badge */}
        {isOpen ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-sm px-3 py-1.5 rounded-xl">
              🟢 LIVE — Round {round}
            </span>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1.5 bg-slate-800 border border-slate-700 text-slate-400 font-bold text-sm px-3 py-1.5 rounded-xl">
            ⚫ {round === 0 ? 'Never opened' : `Round ${round} closed`}
          </span>
        )}

        {/* Action button */}
        {isOpen ? (
          <button
            onClick={handleClose}
            disabled={isPending}
            className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-200 font-bold text-sm px-4 py-2 rounded-2xl transition-all border border-slate-600/60"
          >
            {isPending ? 'Closing…' : 'Close Competition'}
          </button>
        ) : (
          <button
            onClick={handleOpen}
            disabled={isPending}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-black text-sm px-4 py-2 rounded-2xl transition-all shadow-lg shadow-amber-500/20"
          >
            {isPending ? 'Opening…' : `Open Round ${round + 1}`}
          </button>
        )}
      </div>
    </div>
  )
}
