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

  // ── Profile first (need class_section before filtering board) ──
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, avatar, role, class_section')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  if (profile.role === 'teacher') redirect('/teacher')

  // ── Current week bounds (Monday–Sunday UTC) ──
  const now = new Date()
  const day = now.getUTCDay()
  const weekStart = new Date(now)
  weekStart.setUTCDate(weekStart.getUTCDate() + (day === 0 ? -6 : 1 - day))
  weekStart.setUTCHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7)

  // ── Parallel: stats, topic, weekly sessions ──
  const [statsRes, topicRes, weekSessionsRes] = await Promise.all([
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
      .from('sessions')
      .select('student_id, xp_earned, accuracy_score, started_at, completed_at')
      .eq('is_complete', true)
      .eq('session_type', 'competition')
      .gte('completed_at', weekStart.toISOString())
      .lt('completed_at', weekEnd.toISOString()),
  ])

  const stats = statsRes.data
  const topic = topicRes.data

  // ── Aggregate weekly competition sessions ──
  type DashSession = { xp: number; accuracy: number; seconds: number }
  const sessionMap = new Map<string, DashSession>()
  for (const s of weekSessionsRes.data ?? []) {
    const seconds =
      s.started_at && s.completed_at
        ? Math.round(
            (new Date(s.completed_at).getTime() - new Date(s.started_at).getTime()) / 1000,
          )
        : 99999
    const existing = sessionMap.get(s.student_id)
    if (!existing || (s.accuracy_score ?? 0) > existing.accuracy) {
      sessionMap.set(s.student_id, {
        xp:       s.xp_earned ?? 0,
        accuracy: s.accuracy_score ?? 0,
        seconds,
      })
    }
  }
  const weekStudentIds = Array.from(sessionMap.keys())

  // ── Parallel: per-class round state + board profiles ──
  const [roundRes, boardProfilesRes] = await Promise.all([
    topic && profile.class_section
      ? supabase
          .from('competition_rounds')
          .select('is_open, round_number')
          .eq('topic_id', topic.id)
          .eq('class_section', profile.class_section)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    weekStudentIds.length > 0
      ? (() => {
          const q = supabase
            .from('profiles')
            .select('id, name, avatar')
            .in('id', weekStudentIds)
            .eq('role', 'student')
          return profile.class_section
            ? q.eq('class_section', profile.class_section)
            : q
        })()
      : Promise.resolve({ data: [] }),
  ])

  const competitionOpen  = roundRes.data?.is_open       ?? false
  const competitionRound = roundRes.data?.round_number   ?? 0

  // ── Competition completion check (scoped to this student's current round) ──
  const compRes = topic
    ? await supabase
        .from('sessions')
        .select('id')
        .eq('student_id', user.id)
        .eq('topic_id', topic.id)
        .eq('session_type', 'competition')
        .eq('competition_round', competitionRound)
        .eq('is_complete', true)
        .maybeSingle()
    : { data: null }

  const competitionDone      = !!compRes.data
  const competitionSessionId = compRes.data?.id ?? null

  // ── Build weekly board (top 5, ranked by accuracy then speed) ──
  type BoardEntry = {
    student_id:           string
    name:                 string
    avatar:               string
    weekly_xp:            number
    competition_accuracy: number
    completion_seconds:   number
  }
  const board: BoardEntry[] = (boardProfilesRes.data ?? [])
    .map((p: { id: string; name: string; avatar: string }) => ({
      student_id:           p.id,
      name:                 p.name,
      avatar:               p.avatar,
      weekly_xp:            sessionMap.get(p.id)?.xp ?? 0,
      competition_accuracy: sessionMap.get(p.id)?.accuracy ?? 0,
      completion_seconds:   sessionMap.get(p.id)?.seconds ?? 99999,
    }))
    .sort((a: BoardEntry, b: BoardEntry) =>
      b.competition_accuracy - a.competition_accuracy ||
      a.completion_seconds - b.completion_seconds
    )
    .slice(0, 5)

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
            <div className="flex gap-2">
              {/* Practice — unlimited, no XP */}
              <Link
                href={`/session/${topic.id}?mode=practice`}
                className="inline-flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 active:scale-95 text-slate-200 font-bold text-sm px-4 py-3 rounded-2xl transition-all border border-slate-600/60"
              >
                🔬 Practice
              </Link>

              {/* Competition — one shot per round, earns XP */}
              {competitionDone ? (
                <Link
                  href={`/session/summary?session=${competitionSessionId}`}
                  className="inline-flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-sm px-4 py-3 rounded-2xl transition-all"
                >
                  ✓ Competition Done
                </Link>
              ) : competitionOpen ? (
                <Link
                  href={`/session/${topic.id}?mode=competition`}
                  className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-900 font-black text-sm px-4 py-3 rounded-2xl transition-all shadow-lg shadow-amber-500/20"
                >
                  <Zap size={14} className="fill-slate-900" />
                  Competition
                  <ChevronRight size={14} />
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5 bg-slate-800 border border-slate-700 text-slate-500 font-bold text-sm px-4 py-3 rounded-2xl cursor-not-allowed select-none">
                  🔒 Competition Locked
                </span>
              )}
            </div>
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
              <h3 className="text-xs font-black uppercase tracking-wider">This Week</h3>
            </div>
            {myRank > 0 && (
              <span className="text-xs text-slate-500 font-medium">You&apos;re #{myRank}</span>
            )}
          </div>

          {board.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">
              No scores yet this week — be the first! 🚀
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
                    <span className="text-xs text-teal-400 font-bold tabular-nums">
                      {entry.competition_accuracy.toFixed(1)}%
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
