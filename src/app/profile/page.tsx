import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  FlaskConical, Atom, Microscope, Rocket, Star,
  ArrowLeft, Zap, Flame, Target, Trophy, CheckCircle2,
} from 'lucide-react'
import { signOut } from '@/app/dashboard/actions'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const LEVELS = [
  { level: 1, title: 'Lab Intern',       xpRequired: 0,    nextXp: 500 },
  { level: 2, title: 'Field Researcher', xpRequired: 500,  nextXp: 1200 },
  { level: 3, title: 'Scientist',        xpRequired: 1200, nextXp: 2500 },
  { level: 4, title: 'Senior Scientist', xpRequired: 2500, nextXp: 4500 },
  { level: 5, title: 'Lead Researcher',  xpRequired: 4500, nextXp: 7500 },
  { level: 6, title: 'Professor',        xpRequired: 7500, nextXp: 9999 },
]

function getLevelInfo(xp: number) {
  let current = LEVELS[0]
  for (const l of LEVELS) {
    if (xp >= l.xpRequired) current = l
  }
  const isMax = current.level === 6
  const progress = isMax
    ? 100
    : Math.round(((xp - current.xpRequired) / (current.nextXp - current.xpRequired)) * 100)
  return { ...current, progress, isMax }
}

const AVATAR_ICONS: Record<string, React.ReactNode> = {
  flask:      <FlaskConical size={22} />,
  atom:       <Atom size={22} />,
  microscope: <Microscope size={22} />,
  rocket:     <Rocket size={22} />,
  star:       <Star size={22} />,
}

const BADGE_INFO: Record<string, { emoji: string; label: string; desc: string }> = {
  first_session: { emoji: '🔬', label: 'First Session',    desc: 'Completed your first session' },
  perfectionist: { emoji: '⚡', label: 'Perfectionist',    desc: 'Scored 100% accuracy on a session' },
  on_fire:       { emoji: '🔥', label: 'On Fire',          desc: 'Maintained a 3-week streak' },
  top_of_class:  { emoji: '🏆', label: 'Top of the Class', desc: '#1 on the weekly leaderboard' },
  most_improved: { emoji: '📈', label: 'Most Improved',    desc: 'Biggest accuracy gain this week' },
  science_brain: { emoji: '🧠', label: 'Science Brain',    desc: 'Scored 90%+ for 3 sessions in a row' },
  veteran:       { emoji: '💎', label: 'Veteran',          desc: 'Completed 10 total sessions' },
}

// All possible badges (so we can show locked ones too)
const ALL_BADGES = Object.keys(BADGE_INFO)

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileRes, statsRes, badgesRes, sessionsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('name, avatar, role, created_at')
      .eq('id', user.id)
      .single(),
    supabase
      .from('student_stats')
      .select('xp, level, streak_weeks, overall_accuracy, total_sessions')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('badges')
      .select('badge_type, earned_at')
      .eq('student_id', user.id)
      .order('earned_at', { ascending: false }),
    supabase
      .from('sessions')
      .select('id, accuracy_score, xp_earned, correct_answers, total_attempts, completed_at, topics(title)')
      .eq('student_id', user.id)
      .eq('is_complete', true)
      .order('completed_at', { ascending: false })
      .limit(5),
  ])

  const profile  = profileRes.data
  const stats    = statsRes.data
  const badges   = badgesRes.data ?? []
  const sessions = sessionsRes.data ?? []

  if (!profile) redirect('/login')
  if (profile.role === 'teacher') redirect('/teacher')

  const xp       = stats?.xp ?? 0
  const accuracy = Number(stats?.overall_accuracy ?? 0)
  const streak   = stats?.streak_weeks ?? 0
  const total    = stats?.total_sessions ?? 0
  const lvlInfo  = getLevelInfo(xp)

  const earnedBadgeTypes = new Set(badges.map((b: { badge_type: string }) => b.badge_type))

  const memberSince = profile.created_at
    ? new Date(profile.created_at as string).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '—'

  return (
    <main className="min-h-screen bg-[#060c18] text-white pb-12">

      {/* ── Header ── */}
      <div className="px-4 pt-8 pb-4 max-w-lg mx-auto">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-200 mb-6 transition-colors text-sm font-medium"
        >
          <ArrowLeft size={15} />
          Back to Dashboard
        </Link>
      </div>

      <div className="px-4 max-w-lg mx-auto space-y-4">

        {/* ── Profile hero ── */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 flex-shrink-0">
              {AVATAR_ICONS[profile.avatar] ?? <FlaskConical size={22} />}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black text-white leading-tight truncate">{profile.name}</h1>
              <p className="text-sm text-teal-400 font-bold">{lvlInfo.title}</p>
              <p className="text-xs text-slate-600 mt-0.5">Member since {memberSince}</p>
            </div>
          </div>

          {/* XP bar */}
          <div className="mt-5">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-slate-500">
                Level {lvlInfo.level}
                {!lvlInfo.isMax && ` → Level ${lvlInfo.level + 1}`}
              </span>
              <span className="text-xs font-bold text-teal-400">
                {lvlInfo.isMax ? '🎓 Max' : `${xp.toLocaleString()} / ${lvlInfo.nextXp.toLocaleString()} XP`}
              </span>
            </div>
            <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-cyan-400 rounded-full transition-all duration-700"
                style={{ width: `${lvlInfo.progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── Stats grid ── */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<Zap size={16} className="fill-teal-400 text-teal-400" />}
            value={xp.toLocaleString()}
            label="Total XP"
            color="teal"
          />
          <StatCard
            icon={<Target size={16} className="text-violet-400" />}
            value={`${accuracy.toFixed(1)}%`}
            label="Overall Accuracy"
            color="violet"
          />
          <StatCard
            icon={<Flame size={16} className="text-orange-400" />}
            value={streak === 0 ? '—' : `${streak}w`}
            label="Current Streak"
            color="orange"
          />
          <StatCard
            icon={<Trophy size={16} className="text-amber-400" />}
            value={total.toString()}
            label="Sessions Done"
            color="amber"
          />
        </div>

        {/* ── Badges ── */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-base">🏅</span>
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-300">Badges</h2>
            <span className="ml-auto text-xs text-slate-600 font-medium">
              {earnedBadgeTypes.size}/{ALL_BADGES.length} earned
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {ALL_BADGES.map((badgeType) => {
              const info    = BADGE_INFO[badgeType]
              const earned  = earnedBadgeTypes.has(badgeType)
              const earnedRow = badges.find((b: { badge_type: string; earned_at: string }) => b.badge_type === badgeType)
              const earnedDate = earnedRow?.earned_at
                ? new Date(earnedRow.earned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : null

              return (
                <div
                  key={badgeType}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all ${
                    earned
                      ? 'border-teal-500/25 bg-teal-500/8'
                      : 'border-slate-700/40 bg-slate-800/30 opacity-40'
                  }`}
                >
                  <span className="text-2xl flex-shrink-0">{info.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold ${earned ? 'text-white' : 'text-slate-400'}`}>
                      {info.label}
                    </p>
                    <p className="text-xs text-slate-500 leading-snug">{info.desc}</p>
                  </div>
                  {earned && (
                    <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                      <CheckCircle2 size={15} className="text-teal-400" />
                      {earnedDate && (
                        <span className="text-xs text-slate-600">{earnedDate}</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Recent sessions ── */}
        {sessions.length > 0 && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-300 mb-4">
              Recent Sessions
            </h2>

            <div className="space-y-2">
              {(sessions as {
                id: string
                accuracy_score: number
                xp_earned: number
                correct_answers: number
                total_attempts: number
                completed_at: string
                topics: { title?: string } | null
              }[]).map((s) => {
                const acc = s.accuracy_score ?? 0
                const accColor =
                  acc >= 90 ? 'text-emerald-400' :
                  acc >= 70 ? 'text-amber-400' :
                  'text-red-400'

                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 px-3 py-3 bg-slate-800/50 rounded-2xl border border-slate-700/40"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-200 truncate">
                        {s.topics?.title ?? 'Session'}
                      </p>
                      <p className="text-xs text-slate-600">
                        {s.completed_at
                          ? new Date(s.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : ''}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-black ${accColor}`}>{acc}%</p>
                      <p className="text-xs text-amber-400">+{s.xp_earned} XP</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

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

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode
  value: string
  label: string
  color: 'teal' | 'violet' | 'orange' | 'amber'
}) {
  const ring = {
    teal:   'border-teal-500/20 bg-teal-500/8',
    violet: 'border-violet-500/20 bg-violet-500/8',
    orange: 'border-orange-500/20 bg-orange-500/8',
    amber:  'border-amber-500/20 bg-amber-500/8',
  }[color]

  return (
    <div className={`${ring} border rounded-2xl px-4 py-4`}>
      <div className="flex items-center gap-2 mb-2">{icon}</div>
      <p className="text-xl font-black text-white leading-none mb-1">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  )
}
