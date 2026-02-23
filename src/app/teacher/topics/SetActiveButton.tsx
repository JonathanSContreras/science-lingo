'use client'

import { useTransition } from 'react'
import { setTopicActive } from './actions'

export function SetActiveButton({ topicId }: { topicId: string }) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      await setTopicActive(topicId)
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="text-xs text-slate-400 hover:text-teal-400 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 px-3 py-2 rounded-xl transition-all font-semibold"
    >
      {isPending ? 'Setting…' : 'Set Active'}
    </button>
  )
}
