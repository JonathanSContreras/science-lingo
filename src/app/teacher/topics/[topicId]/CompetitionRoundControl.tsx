'use client'

import { useTransition } from 'react'
import { openCompetition, closeCompetition, openAllCompetitions, closeAllCompetitions } from '../actions'

const ALL_SECTIONS = ['8A', '8B', '8C', '8D', '8E', '8F'] as const

interface RoundData {
  class_section: string
  is_open:       boolean
  round_number:  number
}

interface Props {
  topicId: string
  rounds:  RoundData[]
}

function SectionRow({ topicId, section, data }: { topicId: string; section: string; data: RoundData }) {
  const [isPending, startTransition] = useTransition()

  function handleOpen() {
    startTransition(async () => { await openCompetition(topicId, section) })
  }

  function handleClose() {
    startTransition(async () => { await closeCompetition(topicId, section) })
  }

  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="text-xs font-black text-slate-300 w-7 flex-shrink-0">{section}</span>

      <div className="flex-1">
        {data.is_open ? (
          <span className="inline-flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs px-2.5 py-1 rounded-lg">
            🟢 LIVE — Round {data.round_number}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 bg-slate-800 border border-slate-700 text-slate-500 font-bold text-xs px-2.5 py-1 rounded-lg">
            ⚫ {data.round_number === 0 ? 'Never opened' : `Round ${data.round_number} closed`}
          </span>
        )}
      </div>

      {data.is_open ? (
        <button
          onClick={handleClose}
          disabled={isPending}
          className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-200 font-bold text-xs px-3 py-1.5 rounded-xl transition-all border border-slate-600/60 w-20 text-center"
        >
          {isPending ? '…' : 'Close'}
        </button>
      ) : (
        <button
          onClick={handleOpen}
          disabled={isPending}
          className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-black text-xs px-3 py-1.5 rounded-xl transition-all shadow shadow-amber-500/20 w-20 text-center"
        >
          {isPending ? '…' : `Open R${data.round_number + 1}`}
        </button>
      )}
    </div>
  )
}

export function CompetitionRoundControl({ topicId, rounds }: Props) {
  const [batchPending, startBatchTransition] = useTransition()

  const roundMap     = new Map(rounds.map((r) => [r.class_section, r]))
  const allSections  = ALL_SECTIONS.map(
    (s) => roundMap.get(s) ?? { class_section: s, is_open: false, round_number: 0 },
  )
  const anyOpen = allSections.some((r) => r.is_open)

  function handleOpenAll() {
    startBatchTransition(async () => { await openAllCompetitions(topicId) })
  }

  function handleCloseAll() {
    startBatchTransition(async () => { await closeAllCompetitions(topicId) })
  }

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xs font-black uppercase tracking-wider text-violet-400">
          Competition Rounds
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleCloseAll}
            disabled={batchPending || !anyOpen}
            className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-200 font-bold text-xs px-3 py-1.5 rounded-xl transition-all border border-slate-600/60"
          >
            Close All
          </button>
          <button
            onClick={handleOpenAll}
            disabled={batchPending}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-black text-xs px-3 py-1.5 rounded-xl transition-all shadow-lg shadow-amber-500/20"
          >
            Open All
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-500 mb-4">
        Open rounds per class. Each new round resets eligibility — students who competed in a prior round can compete again.
      </p>

      <div className="divide-y divide-slate-800/60">
        {allSections.map((data) => (
          <SectionRow
            key={data.class_section}
            topicId={topicId}
            section={data.class_section}
            data={data}
          />
        ))}
      </div>
    </div>
  )
}
