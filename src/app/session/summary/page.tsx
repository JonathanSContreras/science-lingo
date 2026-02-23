import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Trophy, Zap, Flame, Target, ChevronRight } from 'lucide-react'

// ─── Level helpers (mirrors dashboard) ──────────────────────────────────────

const LEVELS = [
  { level: 1, title: 'Lab Intern',       xpRequired: 0 },
  { level: 2, title: 'Field Researcher', xpRequired: 500 },
  { level: 3, title: 'Scientist',        xpRequired: 1200 },
  { level: 4, title: 'Senior Scientist', xpRequired: 2500 },
  { level: 5, title: 'Lead Researcher',  xpRequired: 4500 },
  { level: 6, title: 'Professor',        xpRequired: 7500 },
]

function getLevelTitle(xp: number) {
  let title = LEVELS[0].title
  for (const l of LEVELS) {
    if (xp >= l.xpRequired) title = l.title
  }
  return title
}

function getHighlight(accuracy: number): string {
  if (accuracy === 100) return '🌟 Perfect Score!'
  if (accuracy >= 95)   return '🔥 Outstanding!'
  if (accuracy >= 80)   return '⚡ Great Work!'
  if (accuracy >= 60)   return '📈 Keep It Up!'
  return '💪 Practice Makes Perfect!'
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function SessionSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>
}) {
  const { session: sessionId } = await searchParams
  if (!sessionId) redirect('/dashboard')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch the completed session
  const { data: session } = await supabase
    .from('sessions')
    .select('*, topics(title, standard)')
    .eq('id', sessionId)
    .eq('student_id', user.id)
    .maybeSingle()

  if (!session || !session.is_complete) redirect('/dashboard')

  // Fetch updated student stats + leaderboard rank in parallel
  const [statsRes, boardRes] = await Promise.all([
    supabase
      .from('student_stats')
      .select('xp, level, streak_weeks, overall_accuracy, total_sessions')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('leaderboard')
      .select('student_id, rank')
      .order('rank'),
  ])

  const stats    = statsRes.data
  const board    = boardRes.data ?? []
  const myRankRow = board.find((r: { student_id: string; rank: number }) => r.student_id === user.id)
  const myRank   = myRankRow?.rank ?? 0

  const accuracy    = session.accuracy_score ?? 0
  const xpEarned    = session.xp_earned ?? 0
  const streak      = stats?.streak_weeks ?? 1
  const totalXp     = stats?.xp ?? 0
  const levelTitle  = getLevelTitle(totalXp)
  const highlight   = getHighlight(accuracy)

  // XP breakdown (re-calculate labels so summary card is informative)
  const xpParts: string[] = ['100 base']
  if (accuracy === 100)       xpParts.push('+150 perfect')
  else if (accuracy >= 95)    xpParts.push('+100 near-perfect')
  else if (accuracy >= 80)    xpParts.push('+50 accuracy bonus')
  if (streak > 1)             xpParts.push('+25 streak')

  return (
    <main className="min-h-screen bg-[#060c18] flex flex-col items-center justify-center p-4 relative overflow-hidden">

      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-teal-500/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-500/5 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-sm">

        {/* Hero */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4 animate-bounce">
            {accuracy === 100 ? '🏆' : accuracy >= 80 ? '🌟' : '🔬'}
          </div>
          <h1 className="text-3xl font-black text-white">Session Complete!</h1>
          <p className="text-slate-400 text-sm mt-1 font-medium">
            {(session.topics as { title?: string } | null)?.title ?? 'Science Lingo'}
          </p>
          {(session.topics as { standard?: string } | null)?.standard && (
            <p className="text-slate-600 text-xs mt-0.5 font-mono">
              Standard {(session.topics as { standard?: string }).standard}
            </p>
          )}
        </div>

        {/* Highlight pill */}
        <div className="text-center mb-6">
          <span className="inline-block bg-teal-500/15 border border-teal-500/30 text-teal-300 text-sm font-black px-5 py-2 rounded-full">
            {highlight}
          </span>
        </div>

        {/* Stats card */}
        <div className="bg-slate-900/80 border border-slate-700/60 rounded-3xl p-5 shadow-2xl mb-4">
          <div className="grid grid-cols-2 gap-3 mb-4">

            {/* Accuracy */}
            <div className="bg-slate-800/60 rounded-2xl p-4 text-center border border-slate-700/40">
              <Target size={18} className="text-teal-400 mx-auto mb-2" />
              <div className={`text-3xl font-black ${
                accuracy === 100 ? 'text-amber-400' :
                accuracy >= 80  ? 'text-emerald-400' :
                accuracy >= 60  ? 'text-white' : 'text-red-400'
              }`}>
                {accuracy}%
              </div>
              <div className="text-xs text-slate-500 mt-1">Accuracy</div>
            </div>

            {/* XP Earned */}
            <div className="bg-slate-800/60 rounded-2xl p-4 text-center border border-slate-700/40">
              <Zap size={18} className="text-amber-400 mx-auto mb-2" />
              <div className="text-3xl font-black text-amber-400">+{xpEarned}</div>
              <div className="text-xs text-slate-500 mt-1">XP Earned</div>
            </div>

            {/* Streak */}
            <div className="bg-slate-800/60 rounded-2xl p-4 text-center border border-slate-700/40">
              <Flame size={18} className="text-orange-400 mx-auto mb-2" />
              <div className="text-3xl font-black text-orange-400">{streak}</div>
              <div className="text-xs text-slate-500 mt-1">Week Streak</div>
            </div>

            {/* Class Rank */}
            <div className="bg-slate-800/60 rounded-2xl p-4 text-center border border-slate-700/40">
              <Trophy size={18} className="text-violet-400 mx-auto mb-2" />
              <div className="text-3xl font-black text-violet-400">
                {myRank > 0 ? `#${myRank}` : '—'}
              </div>
              <div className="text-xs text-slate-500 mt-1">Class Rank</div>
            </div>
          </div>

          {/* Footer row */}
          <div className="flex items-center justify-between px-1 text-xs text-slate-500">
            <span>{session.correct_answers}/{session.total_attempts} correct</span>
            <span>{levelTitle} · {totalXp.toLocaleString()} XP total</span>
          </div>

          {/* XP breakdown */}
          <div className="mt-3 pt-3 border-t border-slate-700/40">
            <p className="text-xs text-slate-600 text-center">
              {xpParts.join(' · ')}
            </p>
          </div>
        </div>

        {/* CTAs */}
        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-teal-500 hover:bg-teal-400 active:scale-[0.98] text-slate-900 font-black text-base transition-all shadow-lg shadow-teal-500/20"
          >
            Back to Dashboard
            <ChevronRight size={18} />
          </Link>
          <Link
            href="/leaderboard"
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-sm transition-all border border-slate-700/50"
          >
            <Trophy size={16} className="text-amber-400" />
            View Full Leaderboard
          </Link>
        </div>

      </div>
    </main>
  )
}
