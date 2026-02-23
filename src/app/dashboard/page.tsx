import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  FlaskConical, Atom, Microscope, Rocket, Star,
  Zap, Flame, Target, Trophy, ChevronRight,
} from 'lucide-react'
import { signOut } from './actions'

// ─── Level config ──────────────────────────────────────────────────────────────

const LEVELS = [
  { level: 1, title: 'Lab Intern',       xpRequired: 0 },
  { level: 2, title: 'Field Researcher', xpRequired: 500 },
  { level: 3, title: 'Scientist',        xpRequired: 1200 },
  { level: 4, title: 'Senior Scientist', xpRequired: 2500 },
  { level: 5, title: 'Lead Researcher',  xpRequired: 4500 },
  { level: 6, title: 'Professor',        xpRequired: 7500 },
]

function getLevelInfo(xp: number) {
  let current = LEVELS[0]
  for (const l of LEVELS) {
    if (xp >= l.xpRequired) current = l
  }
  const next = LEVELS.find((l) => l.xpRequired > xp)
  const progress = next
    ? Math.round(((xp - current.xpRequired) / (next.xpRequired - current.xpRequired)) * 100)
    : 100
  return { current, next, progress }
}

// ─── Avatar map ────────────────────────────────────────────────────────────────

const AVATARS: Record<string, React.ReactNode> = {
  flask:      <FlaskConical size={18} />,
  atom:       <Atom size={18} />,
  microscope: <Microscope size={18} />,
  rocket:     <Rocket size={18} />,
  star:       <Star size={18} />,
}

const MEDALS = ['🥇', '🥈', '🥉']

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // All queries in parallel
  const [profileRes, statsRes, topicRes, boardRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('name, avatar, role')
      .eq('id', user.id)
      .single(),
    supabase
      .from('student_stats')
      .select('xp, level, streak_weeks, overall_accuracy, total_sessions')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('topics')
      .select('id, title, standard, description')
      .eq('is_active', true)
      .maybeSingle(),
    supabase
      .from('leaderboard')
      .select('student_id, name, avatar, overall_accuracy, xp, streak_weeks, rank')
      .order('rank')
      .limit(5),
  ])

  const profile   = profileRes.data
  const stats     = statsRes.data
  const topic     = topicRes.data
  const board     = boardRes.data ?? []

  if (!profile) redirect('/login')

  // Teacher goes to their own dashboard
  if (profile.role === 'teacher') redirect('/teacher')

  const xp       = stats?.xp ?? 0
  const accuracy = Number(stats?.overall_accuracy ?? 0)
  const streak   = stats?.streak_weeks ?? 0
  const { current: lvl, next: nextLvl, progress } = getLevelInfo(xp)
  const myRank   = board.findIndex((e) => e.student_id === user.id) + 1

  return (
    <main className="min-h-screen bg-[#060c18] text-white">

      {/* ── Header ── */}
      <header className="px-4 pt-8 pb-4 flex items-center justify-between max-w-lg mx-auto">
        <div>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-0.5">
            Welcome back
          </p>
          <h1 className="text-2xl font-black leading-none">{profile.name}</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs font-bold text-teal-400">{lvl.title}</p>
            <p className="text-xs text-slate-500">Level {lvl.level}</p>
          </div>
          <Link
            href="/profile"
            className="w-11 h-11 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400 hover:border-teal-500/60 hover:bg-slate-700 transition-all"
            title="View profile"
          >
            {AVATARS[profile.avatar] ?? <FlaskConical size={18} />}
          </Link>
        </div>
      </header>

      <div className="px-4 max-w-lg mx-auto space-y-4 pb-10">

        {/* ── XP / Stats card ── */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <StatPill
              icon={<Zap size={13} className="fill-teal-400 text-teal-400" />}
              value={xp.toLocaleString()}
              label="Total XP"
              color="teal"
            />
            <StatPill
              icon={<Target size={13} className="text-violet-400" />}
              value={`${accuracy.toFixed(1)}%`}
              label="Accuracy"
              color="violet"
            />
            <StatPill
              icon={<Flame size={13} className="text-orange-400" />}
              value={streak === 0 ? '—' : `${streak}w`}
              label="Streak"
              color="orange"
            />
          </div>

          {/* XP bar */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-slate-500">
                {nextLvl
                  ? `${(xp - lvl.xpRequired).toLocaleString()} / ${(nextLvl.xpRequired - lvl.xpRequired).toLocaleString()} XP → ${nextLvl.title}`
                  : '🎓 Max rank achieved'}
              </span>
              <span className="text-xs font-bold text-teal-400">{progress}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-cyan-400 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── Topic card ── */}
        {topic ? (
          <div className="relative overflow-hidden bg-gradient-to-br from-teal-900/40 to-slate-900/60 border border-teal-500/25 rounded-3xl p-5">
            {/* Glow */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-teal-400/8 rounded-full blur-3xl pointer-events-none" />

            <p className="text-xs font-bold text-teal-400 uppercase tracking-widest mb-2">
              This Week&apos;s Topic
            </p>
            <h2 className="text-2xl font-black leading-tight mb-1">{topic.title}</h2>
            {topic.standard && (
              <p className="text-xs font-mono text-slate-500 mb-3">Standard {topic.standard}</p>
            )}
            {topic.description && (
              <p className="text-sm text-slate-400 leading-relaxed mb-5">{topic.description}</p>
            )}
            <Link
              href={`/session/${topic.id}`}
              className="inline-flex items-center gap-2 bg-teal-500 hover:bg-teal-400 active:scale-95 text-slate-900 font-black text-sm px-5 py-3 rounded-2xl transition-all shadow-lg shadow-teal-500/20"
            >
              <Zap size={14} className="fill-slate-900" />
              Start Session
              <ChevronRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 text-center">
            <div className="text-4xl mb-3">🔭</div>
            <h2 className="font-bold text-slate-300 mb-1">No Active Topic Yet</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Your teacher hasn&apos;t posted this week&apos;s topic. Check back soon!
            </p>
          </div>
        )}

        {/* ── Leaderboard ── */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy size={15} className="text-amber-400" />
              <h3 className="text-xs font-black uppercase tracking-wider">Leaderboard</h3>
            </div>
            {myRank > 0 && (
              <span className="text-xs text-slate-500 font-medium">You&apos;re #{myRank}</span>
            )}
          </div>

          {board.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">
              No scores yet — be the first! 🚀
            </p>
          ) : (
            <div className="space-y-1.5">
              {board.map((entry, i) => {
                const isMe = entry.student_id === user.id
                return (
                  <div
                    key={entry.student_id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl ${
                      isMe
                        ? 'bg-teal-500/10 border border-teal-500/20'
                        : 'hover:bg-slate-800/50'
                    }`}
                  >
                    <span className="w-5 text-center text-sm flex-shrink-0">
                      {i < 3 ? MEDALS[i] : (
                        <span className="text-slate-500 font-bold text-xs">#{i + 1}</span>
                      )}
                    </span>
                    <div className="w-7 h-7 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400 flex-shrink-0">
                      {AVATARS[entry.avatar] ?? <FlaskConical size={14} />}
                    </div>
                    <span className={`flex-1 text-sm font-semibold truncate ${isMe ? 'text-teal-300' : 'text-slate-200'}`}>
                      {entry.name}{isMe ? ' (you)' : ''}
                    </span>
                    <span className="text-xs text-slate-400 font-mono tabular-nums">
                      {Number(entry.overall_accuracy).toFixed(1)}%
                    </span>
                    <span className="text-xs text-teal-500 font-bold tabular-nums">
                      ⚡{entry.xp}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          <Link
            href="/leaderboard"
            className="mt-4 flex items-center justify-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            View full leaderboard <ChevronRight size={12} />
          </Link>
        </div>

        {/* ── Sign out ── */}
        <form action={signOut}>
          <button
            type="submit"
            className="w-full text-xs text-slate-600 hover:text-slate-400 transition-colors py-2"
          >
            Sign out
          </button>
        </form>

      </div>
    </main>
  )
}

// ─── StatPill ──────────────────────────────────────────────────────────────────

function StatPill({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode
  value: string
  label: string
  color: 'teal' | 'violet' | 'orange'
}) {
  const ring = {
    teal:   'bg-teal-500/10 border-teal-500/20',
    violet: 'bg-violet-500/10 border-violet-500/20',
    orange: 'bg-orange-500/10 border-orange-500/20',
  }[color]

  return (
    <div className={`${ring} border rounded-2xl px-2 py-3 text-center`}>
      <div className="flex justify-center mb-1">{icon}</div>
      <p className="text-sm font-black text-white leading-none mb-0.5">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  )
}
