import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  FlaskConical, Atom, Microscope, Rocket, Star,
  Trophy, Flame, ArrowLeft, Target, Zap, Calendar,
} from 'lucide-react'

// ─── Constants ───────────────────────────────────────────────────────────────

const SECTIONS = ['8A', '8B', '8C', '8D', '8E', '8F'] as const

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
  for (const l of LEVELS) { if (xp >= l.xpRequired) title = l.title }
  return title
}

const AVATAR_ICONS: Record<string, React.ReactNode> = {
  flask:      <FlaskConical size={16} />,
  atom:       <Atom size={16} />,
  microscope: <Microscope size={16} />,
  rocket:     <Rocket size={16} />,
  star:       <Star size={16} />,
}

const MEDALS = ['🥇', '🥈', '🥉']

// ─── Week helpers ─────────────────────────────────────────────────────────────

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getUTCDay()                  // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day     // shift back to Monday
  d.setUTCDate(d.getUTCDate() + diff)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

function formatWeekRange(weekStart: Date): string {
  const end = new Date(weekStart)
  end.setUTCDate(end.getUTCDate() + 6)
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  return `${fmt(weekStart)} – ${fmt(end)}`
}

// ─── Types ───────────────────────────────────────────────────────────────────

type DisplayEntry = {
  student_id:        string
  name:              string
  avatar:            string
  class_section:     string | null
  streak_weeks:      number
  xp:                number   // all-time XP (for level title + overall score)
  weekly_xp:         number   // weekly XP (0 in overall view)
  overall_accuracy?: number   // only in overall view
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string; view?: string; week?: string }>
}) {
  const { section: sectionParam, view: viewParam, week: weekParam } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, class_section')
    .eq('id', user.id)
    .single()

  const isTeacher = profile?.role === 'teacher'

  // Teacher: ?section= param; Student: always their own section
  const activeSection: string = isTeacher
    ? (sectionParam ?? 'all')
    : (profile?.class_section ?? 'all')

  // Teachers can toggle views; students always see weekly
  const viewMode: 'week' | 'overall' =
    isTeacher && viewParam === 'overall' ? 'overall' : 'week'

  // Week selection (teachers can pick; students always current week)
  const currentWeekStart = getWeekStart(new Date())
  const currentWeekStr   = currentWeekStart.toISOString().split('T')[0]
  const selectedWeekStr  = isTeacher && weekParam ? weekParam : currentWeekStr
  const selectedWeekStart = new Date(selectedWeekStr + 'T00:00:00Z')
  const selectedWeekEnd   = new Date(selectedWeekStart)
  selectedWeekEnd.setUTCDate(selectedWeekEnd.getUTCDate() + 7)
  const isCurrentWeek = selectedWeekStr === currentWeekStr

  // ── URL builder (preserves section + view + week correctly) ──────────────
  function buildUrl(overrides: { section?: string; view?: 'week' | 'overall'; week?: string }) {
    const resolvedSection = overrides.section  ?? activeSection
    const resolvedView    = 'view' in overrides ? overrides.view : (viewMode === 'overall' ? 'overall' : 'week')
    const resolvedWeek    = overrides.week ?? (resolvedView !== 'overall' && !isCurrentWeek ? selectedWeekStr : undefined)
    const p = new URLSearchParams()
    if (resolvedSection !== 'all')                          p.set('section', resolvedSection)
    if (resolvedView === 'overall')                         p.set('view', 'overall')
    if (resolvedWeek && resolvedWeek !== currentWeekStr)    p.set('week', resolvedWeek)
    const q = p.toString()
    return q ? `/leaderboard?${q}` : '/leaderboard'
  }

  // ── Data fetching ─────────────────────────────────────────────────────────

  let entries: DisplayEntry[] = []
  let availableWeeks: string[] = []

  if (viewMode === 'overall') {
    // ── Overall: use leaderboard view ──
    const query = supabase
      .from('leaderboard')
      .select('student_id, name, avatar, class_section, overall_accuracy, xp, streak_weeks')
      .order('overall_accuracy', { ascending: false })
      .order('xp', { ascending: false })

    const { data: board } = activeSection !== 'all'
      ? await query.eq('class_section', activeSection)
      : await query

    entries = (board ?? []).map((e: {
      student_id: string; name: string; avatar: string; class_section: string | null;
      overall_accuracy: number; xp: number; streak_weeks: number;
    }) => ({
      student_id:       e.student_id,
      name:             e.name,
      avatar:           e.avatar,
      class_section:    e.class_section,
      streak_weeks:     e.streak_weeks ?? 0,
      xp:               e.xp ?? 0,
      weekly_xp:        0,
      overall_accuracy: e.overall_accuracy ?? 0,
    }))

  } else {
    // ── Weekly: aggregate from sessions ──
    const { data: weekSessions } = await supabase
      .from('sessions')
      .select('student_id, xp_earned')
      .eq('is_complete', true)
      .eq('session_type', 'competition')
      .gte('completed_at', selectedWeekStart.toISOString())
      .lt('completed_at', selectedWeekEnd.toISOString())

    const xpMap = new Map<string, number>()
    for (const s of weekSessions ?? []) {
      xpMap.set(s.student_id, (xpMap.get(s.student_id) ?? 0) + (s.xp_earned ?? 0))
    }

    const studentIds = Array.from(xpMap.keys())

    if (studentIds.length > 0) {
      const profileQuery = (() => {
        const q = supabase
          .from('profiles')
          .select('id, name, avatar, class_section')
          .in('id', studentIds)
          .eq('role', 'student')
        return activeSection !== 'all' ? q.eq('class_section', activeSection) : q
      })()

      const [profilesRes, statsRes] = await Promise.all([
        profileQuery,
        supabase
          .from('student_stats')
          .select('user_id, streak_weeks, xp')
          .in('user_id', studentIds),
      ])

      const statsMap = new Map(
        (statsRes.data ?? []).map((s: { user_id: string; streak_weeks: number; xp: number }) => [
          s.user_id,
          { streak: s.streak_weeks ?? 0, xp: s.xp ?? 0 },
        ]),
      )

      entries = (profilesRes.data ?? [])
        .map((p: { id: string; name: string; avatar: string; class_section: string | null }) => ({
          student_id:    p.id,
          name:          p.name,
          avatar:        p.avatar,
          class_section: p.class_section,
          weekly_xp:     xpMap.get(p.id) ?? 0,
          streak_weeks:  statsMap.get(p.id)?.streak ?? 0,
          xp:            statsMap.get(p.id)?.xp ?? 0,
        }))
        .sort((a, b) => b.weekly_xp - a.weekly_xp)
    }
  }

  // ── Available weeks for teacher week picker ───────────────────────────────
  if (isTeacher) {
    const { data: completedDates } = await supabase
      .from('sessions')
      .select('completed_at')
      .eq('is_complete', true)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(300)

    const weekSet = new Set<string>()
    weekSet.add(currentWeekStr)
    for (const row of completedDates ?? []) {
      const ws = getWeekStart(new Date(row.completed_at)).toISOString().split('T')[0]
      weekSet.add(ws)
    }
    availableWeeks = Array.from(weekSet).sort((a, b) => b.localeCompare(a)).slice(0, 8)
  }

  // ── Derived display values ────────────────────────────────────────────────
  const myIndex  = entries.findIndex((e) => e.student_id === user.id)
  const myRank   = myIndex >= 0 ? myIndex + 1 : null
  const top3     = entries.slice(0, 3)
  const backHref = isTeacher ? '/teacher' : '/dashboard'
  const sectionLabel = activeSection === 'all' ? 'All Classes' : `Class ${activeSection}`

  const headerSub = viewMode === 'week'
    ? (isCurrentWeek ? 'This week · ranked by XP earned' : `Week of ${formatWeekRange(selectedWeekStart)}`)
    : 'All time · ranked by accuracy'

  return (
    <main className="min-h-screen bg-[#060c18] text-white pb-12">

      {/* ── Header ── */}
      <div className="px-4 pt-8 pb-4 max-w-lg mx-auto">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-200 mb-6 transition-colors text-sm font-medium"
        >
          <ArrowLeft size={15} />
          Back
        </Link>

        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-slate-800 rounded-2xl border border-slate-700 flex items-center justify-center">
            <Trophy size={20} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-black">{sectionLabel} Leaderboard</h1>
            <p className="text-xs text-slate-500">{headerSub}</p>
          </div>
        </div>
      </div>

      <div className="px-4 max-w-lg mx-auto">

        {/* ── Teacher: view toggle ── */}
        {isTeacher && (
          <div className="flex gap-2 mb-4">
            <Link
              href={buildUrl({ view: 'week' })}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                viewMode === 'week'
                  ? 'bg-teal-500 text-slate-900 shadow-sm shadow-teal-500/20'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60'
              }`}
            >
              📅 This Week
            </Link>
            <Link
              href={buildUrl({ view: 'overall' })}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                viewMode === 'overall'
                  ? 'bg-teal-500 text-slate-900 shadow-sm shadow-teal-500/20'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60'
              }`}
            >
              🏆 All Time
            </Link>
          </div>
        )}

        {/* ── Teacher: week picker ── */}
        {isTeacher && viewMode === 'week' && availableWeeks.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4" style={{ scrollbarWidth: 'none' }}>
            {availableWeeks.map((ws) => {
              const isActive = ws === selectedWeekStr
              const wDate    = new Date(ws + 'T00:00:00Z')
              return (
                <Link
                  key={ws}
                  href={buildUrl({ week: ws })}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-amber-500 text-slate-900 shadow-sm shadow-amber-500/20'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                  }`}
                >
                  {ws === currentWeekStr ? 'This Week' : formatWeekRange(wDate)}
                </Link>
              )
            })}
          </div>
        )}

        {/* ── Teacher: section tabs ── */}
        {isTeacher && (
          <div className="flex gap-1.5 flex-wrap mb-5">
            {(['all', ...SECTIONS] as const).map((s) => {
              const isActive = activeSection === s
              return (
                <Link
                  key={s}
                  href={buildUrl({ section: s })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-teal-500 text-slate-900 shadow-sm shadow-teal-500/20'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                  }`}
                >
                  {s === 'all' ? 'All Classes' : `Class ${s}`}
                </Link>
              )
            })}
          </div>
        )}

        {/* ── Student: section + week badge ── */}
        {!isTeacher && profile?.class_section && (
          <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/25 text-teal-300 text-xs font-bold px-3 py-1.5 rounded-full mb-5">
            <Calendar size={11} className="text-teal-400" />
            Class {profile.class_section} · This Week
          </div>
        )}

        {/* ── Rank callout ── */}
        {myRank ? (
          <p className="text-xs text-slate-500 mb-3">
            You&apos;re ranked <span className="text-teal-400 font-black">#{myRank}</span>
            {viewMode === 'week' ? ' this week' : ' all time'}
          </p>
        ) : !isTeacher && viewMode === 'week' && (
          <p className="text-xs text-slate-500 mb-3">
            Complete a competition round to appear on the board!
          </p>
        )}

        {/* ── Podium ── */}
        {top3.length >= 3 && (
          <div className="mb-6 bg-slate-900/60 border border-slate-700/50 rounded-3xl p-5">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider text-center mb-5">
              Top Scientists
            </p>
            <div className="flex items-end justify-center gap-4">

              {/* 2nd */}
              <div className="flex-1 flex flex-col items-center gap-1.5">
                <div className="text-2xl">🥈</div>
                <div className="w-9 h-9 rounded-xl bg-slate-700 border border-slate-600 flex items-center justify-center text-teal-400">
                  {AVATAR_ICONS[top3[1].avatar] ?? <FlaskConical size={14} />}
                </div>
                <p className="text-xs font-bold text-slate-300 text-center truncate w-full px-1">
                  {top3[1].name.split(' ')[0]}
                </p>
                <div className="w-full h-16 bg-slate-700 rounded-xl flex flex-col items-center justify-center gap-0.5">
                  {viewMode === 'overall' && isTeacher && (
                    <span className="text-sm font-black text-white">
                      {Number(top3[1].overall_accuracy).toFixed(1)}%
                    </span>
                  )}
                  <span className={`font-bold ${viewMode === 'overall' && isTeacher ? 'text-xs text-slate-400' : 'text-sm text-white'}`}>
                    ⚡{viewMode === 'week' ? `+${top3[1].weekly_xp}` : top3[1].xp.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* 1st */}
              <div className="flex-1 flex flex-col items-center gap-1.5">
                <div className="text-3xl">🥇</div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  {AVATAR_ICONS[top3[0].avatar] ?? <FlaskConical size={16} />}
                </div>
                <p className="text-xs font-black text-white text-center truncate w-full px-1">
                  {top3[0].name.split(' ')[0]}
                </p>
                <div className="w-full h-24 bg-gradient-to-t from-amber-700 to-amber-500 rounded-xl flex flex-col items-center justify-center shadow-lg shadow-amber-500/20 gap-0.5">
                  {viewMode === 'overall' && isTeacher && (
                    <span className="text-sm font-black text-slate-900">
                      {Number(top3[0].overall_accuracy).toFixed(1)}%
                    </span>
                  )}
                  <span className={`font-bold ${viewMode === 'overall' && isTeacher ? 'text-xs text-amber-900/80' : 'text-sm text-slate-900'}`}>
                    ⚡{viewMode === 'week' ? `+${top3[0].weekly_xp}` : top3[0].xp.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* 3rd */}
              <div className="flex-1 flex flex-col items-center gap-1.5">
                <div className="text-2xl">🥉</div>
                <div className="w-9 h-9 rounded-xl bg-slate-700 border border-slate-600 flex items-center justify-center text-teal-400">
                  {AVATAR_ICONS[top3[2].avatar] ?? <FlaskConical size={14} />}
                </div>
                <p className="text-xs font-bold text-slate-300 text-center truncate w-full px-1">
                  {top3[2].name.split(' ')[0]}
                </p>
                <div className="w-full h-12 bg-slate-600 rounded-xl flex flex-col items-center justify-center gap-0.5">
                  {viewMode === 'overall' && isTeacher && (
                    <span className="text-sm font-black text-white">
                      {Number(top3[2].overall_accuracy).toFixed(1)}%
                    </span>
                  )}
                  <span className={`font-bold ${viewMode === 'overall' && isTeacher ? 'text-xs text-slate-400' : 'text-sm text-white'}`}>
                    ⚡{viewMode === 'week' ? `+${top3[2].weekly_xp}` : top3[2].xp.toLocaleString()}
                  </span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ── Column headers ── */}
        {entries.length > 0 && (
          <div className="flex items-center gap-3 px-3 mb-2">
            <span className="w-7 text-xs text-slate-600 font-bold">#</span>
            <span className="flex-1 text-xs text-slate-600 font-bold uppercase tracking-wider">Student</span>
            <div className="flex items-center gap-4 text-xs text-slate-600 font-bold uppercase tracking-wider">
              {viewMode === 'overall' && isTeacher && (
                <span className="flex items-center gap-1"><Target size={10} />Acc</span>
              )}
              <span className="flex items-center gap-1">
                <Zap size={10} />
                {viewMode === 'week' ? 'Wk XP' : 'XP'}
              </span>
              <span className="flex items-center gap-1"><Flame size={10} />Str</span>
            </div>
          </div>
        )}

        {/* ── Full list ── */}
        {entries.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">{viewMode === 'week' ? '📅' : '🚀'}</div>
            <p className="text-slate-400 font-bold">
              {viewMode === 'week' ? 'No scores yet this week' : 'No scores yet'}
            </p>
            <p className="text-slate-600 text-sm mt-1">
              {viewMode === 'week'
                ? 'Complete a competition round to appear here!'
                : 'Be the first on the board!'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, i) => {
              const isMe = entry.student_id === user.id
              const scoreText = viewMode === 'week'
                ? `+${entry.weekly_xp}`
                : entry.xp.toLocaleString()
              return (
                <div
                  key={entry.student_id}
                  className={`flex items-center gap-3 px-3 py-3 rounded-2xl border transition-all ${
                    isMe
                      ? 'border-teal-500/40 bg-teal-500/8 shadow-sm shadow-teal-500/10'
                      : 'border-slate-700/40 bg-slate-900/50 hover:bg-slate-800/60'
                  }`}
                >
                  {/* Rank */}
                  <div className="w-7 text-center flex-shrink-0">
                    {i < 3 ? (
                      <span className="text-base">{MEDALS[i]}</span>
                    ) : (
                      <span className="text-xs text-slate-500 font-bold">#{i + 1}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isMe
                      ? 'bg-teal-500/20 border border-teal-500/40 text-teal-400'
                      : 'bg-slate-800 border border-slate-700 text-teal-400'
                  }`}>
                    {AVATAR_ICONS[entry.avatar] ?? <FlaskConical size={14} />}
                  </div>

                  {/* Name + level */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate ${isMe ? 'text-teal-300' : 'text-slate-200'}`}>
                      {entry.name}
                      {isMe && <span className="text-teal-500 ml-1 text-xs font-semibold">(you)</span>}
                    </p>
                    <p className="text-xs text-slate-600">
                      {getLevelTitle(entry.xp)}
                      {isTeacher && entry.class_section && (
                        <span className="ml-1.5 text-slate-700">· {entry.class_section}</span>
                      )}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 flex-shrink-0">
                    {viewMode === 'overall' && isTeacher && (
                      <span className="text-xs font-black text-white tabular-nums w-10 text-right">
                        {Number(entry.overall_accuracy).toFixed(1)}%
                      </span>
                    )}
                    <span className="text-xs font-bold text-amber-400 tabular-nums w-12 text-right">
                      {scoreText}
                    </span>
                    <div className="flex items-center gap-0.5 text-orange-400 w-7 justify-end">
                      <Flame size={11} />
                      <span className="text-xs font-bold tabular-nums">{entry.streak_weeks ?? 0}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
