import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  FlaskConical, Atom, Microscope, Rocket, Star,
  Users, BookOpen, TrendingUp, Zap, Flame, Target, ChevronRight,
  BarChart2, AlertTriangle,
} from 'lucide-react'
import { signOut } from '../dashboard/actions'

const SECTIONS = ['8A', '8B', '8C', '8D', '8E', '8F'] as const

const AVATARS: Record<string, React.ReactNode> = {
  flask:      <FlaskConical size={14} />,
  atom:       <Atom size={14} />,
  microscope: <Microscope size={14} />,
  rocket:     <Rocket size={14} />,
  star:       <Star size={14} />,
}

export default async function TeacherPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>
}) {
  const { section: sectionParam } = await searchParams
  const activeSection = sectionParam ?? 'all'

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'teacher') redirect('/dashboard')

  // Fetch students filtered by section
  const query = supabase
    .from('leaderboard')
    .select('student_id, name, avatar, class_section, overall_accuracy, xp, level, streak_weeks, total_sessions')
    .order('overall_accuracy', { ascending: false })

  const { data: students } = activeSection !== 'all'
    ? await query.eq('class_section', activeSection)
    : await query

  // Fetch active topic
  const { data: activeTopic } = await supabase
    .from('topics')
    .select('id, title, standard')
    .eq('is_active', true)
    .maybeSingle()

  // Fetch completed sessions for active topic (all sections — we filter below)
  let allTopicSessions: { student_id: string; accuracy_score: number }[] = []
  if (activeTopic) {
    const { data } = await supabase
      .from('sessions')
      .select('student_id, accuracy_score')
      .eq('topic_id', activeTopic.id)
      .eq('is_complete', true)
    allTopicSessions = data ?? []
  }

  // ── Summary stats ─────────────────────────────────────────────────────────
  const totalStudents = students?.length ?? 0
  const avgAccuracy = totalStudents > 0
    ? (students!.reduce((sum, s) => sum + Number(s.overall_accuracy), 0) / totalStudents).toFixed(1)
    : '—'
  const activeStreaks = students?.filter(s => s.streak_weeks > 0).length ?? 0

  // ── Analytics computations (all derived from section-filtered students) ───
  const studentsList = students ?? []
  const studentIdSet = new Set(studentsList.map(s => s.student_id))

  // Active topic completion — filtered to current section
  const sectionTopicSessions = allTopicSessions.filter(ts => studentIdSet.has(ts.student_id))
  const topicCompletionCount  = sectionTopicSessions.length
  const topicCompletionPct    = totalStudents > 0
    ? Math.round((topicCompletionCount / totalStudents) * 100) : 0
  const topicAvgAccuracy      = topicCompletionCount > 0
    ? Math.round(sectionTopicSessions.reduce((s, ts) => s + Number(ts.accuracy_score), 0) / topicCompletionCount)
    : null

  // Accuracy tiers (only students who've done at least 1 session)
  const excellent  = studentsList.filter(s => s.total_sessions > 0 && Number(s.overall_accuracy) >= 90).length
  const good       = studentsList.filter(s => s.total_sessions > 0 && Number(s.overall_accuracy) >= 80 && Number(s.overall_accuracy) < 90).length
  const needsWork  = studentsList.filter(s => s.total_sessions > 0 && Number(s.overall_accuracy) >= 70 && Number(s.overall_accuracy) < 80).length
  const struggling = studentsList.filter(s => s.total_sessions > 0 && Number(s.overall_accuracy) < 70).length
  const noSessions = studentsList.filter(s => s.total_sessions === 0).length
  const activeSessions = excellent + good + needsWork + struggling

  // Needs attention: < 70% accuracy, at least 1 session, sorted by lowest first
  const attentionList = studentsList
    .filter(s => s.total_sessions > 0 && Number(s.overall_accuracy) < 70)
    .sort((a, b) => Number(a.overall_accuracy) - Number(b.overall_accuracy))
    .slice(0, 5)

  return (
    <main className="min-h-screen bg-[#060c18] text-white">

      {/* Header */}
      <header className="px-4 pt-8 pb-4 max-w-2xl mx-auto flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
            Teacher Dashboard
          </p>
          <h1 className="text-2xl font-black">{profile.name}</h1>
        </div>
        <Link
          href="/teacher/topics"
          className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-slate-900 font-bold text-sm px-4 py-2.5 rounded-2xl transition-all"
        >
          <BookOpen size={15} />
          Topics
        </Link>
      </header>

      <div className="px-4 max-w-2xl mx-auto space-y-4 pb-10">

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={<Users size={16} className="text-teal-400" />}
            value={String(totalStudents)}
            label="Students"
            bg="teal"
          />
          <StatCard
            icon={<Target size={16} className="text-violet-400" />}
            value={`${avgAccuracy}%`}
            label="Avg Accuracy"
            bg="violet"
          />
          <StatCard
            icon={<Flame size={16} className="text-orange-400" />}
            value={String(activeStreaks)}
            label="On Streak"
            bg="orange"
          />
        </div>

        {/* Active topic */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-teal-400" />
            <p className="text-xs font-black uppercase tracking-wider">Active Topic</p>
          </div>
          {activeTopic ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-white">{activeTopic.title}</p>
                {activeTopic.standard && (
                  <p className="text-xs text-slate-500 font-mono">Standard {activeTopic.standard}</p>
                )}
              </div>
              <Link
                href="/teacher/topics"
                className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1"
              >
                Manage <ChevronRight size={12} />
              </Link>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">No active topic set</p>
              <Link
                href="/teacher/topics"
                className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1"
              >
                Set one <ChevronRight size={12} />
              </Link>
            </div>
          )}
        </div>

        {/* Section tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {(['all', ...SECTIONS] as const).map((s) => {
            const isActive = activeSection === s
            const href = s === 'all' ? '/teacher' : `/teacher?section=${s}`
            return (
              <Link
                key={s}
                href={href}
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

        {/* ── Analytics ─────────────────────────────────────────────────────── */}
        {totalStudents > 0 && (
          <div className="space-y-3">

            {/* Active topic completion */}
            {activeTopic && (
              <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BarChart2 size={14} className="text-violet-400" />
                    <p className="text-xs font-black uppercase tracking-wider">
                      Topic Participation
                    </p>
                  </div>
                  <span className="text-xs font-bold tabular-nums text-slate-400">
                    {topicCompletionCount} / {totalStudents}
                  </span>
                </div>
                <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-violet-500 rounded-full transition-all duration-500"
                    style={{ width: `${topicCompletionPct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    {topicCompletionPct}% of{activeSection !== 'all' ? ` class ${activeSection}` : ''} students completed
                  </span>
                  {topicAvgAccuracy !== null ? (
                    <span className="font-bold text-violet-400">{topicAvgAccuracy}% avg accuracy</span>
                  ) : (
                    <span className="text-slate-600">No completions yet</span>
                  )}
                </div>
              </div>
            )}

            {/* Accuracy breakdown */}
            {activeSessions > 0 && (
              <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart2 size={14} className="text-slate-400" />
                  <p className="text-xs font-black uppercase tracking-wider">Accuracy Breakdown</p>
                  <span className="ml-auto text-xs text-slate-600">{activeSessions} active student{activeSessions !== 1 ? 's' : ''}</span>
                </div>

                {/* Segmented bar */}
                <div className="flex h-3 rounded-full overflow-hidden gap-px mb-4">
                  {excellent  > 0 && <div className="bg-teal-500"   style={{ flex: excellent }} />}
                  {good       > 0 && <div className="bg-emerald-500" style={{ flex: good }} />}
                  {needsWork  > 0 && <div className="bg-amber-400"   style={{ flex: needsWork }} />}
                  {struggling > 0 && <div className="bg-red-500"     style={{ flex: struggling }} />}
                </div>

                {/* Legend */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <LegendItem dot="bg-teal-500"    label="Excellent (90%+)"   count={excellent}  total={activeSessions} />
                  <LegendItem dot="bg-emerald-500" label="Good (80–89%)"      count={good}       total={activeSessions} />
                  <LegendItem dot="bg-amber-400"   label="Needs Work (70–79%)" count={needsWork}  total={activeSessions} />
                  <LegendItem dot="bg-red-500"     label="Struggling (<70%)"  count={struggling} total={activeSessions} />
                </div>

                {noSessions > 0 && (
                  <p className="text-xs text-slate-600 mt-3 pt-3 border-t border-slate-800">
                    + {noSessions} student{noSessions !== 1 ? 's' : ''} haven&apos;t started a session yet
                  </p>
                )}
              </div>
            )}

            {/* Needs attention */}
            {attentionList.length > 0 && (
              <div className="bg-red-500/8 border border-red-500/20 rounded-3xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle size={14} className="text-red-400" />
                  <p className="text-xs font-black uppercase tracking-wider text-red-400">
                    Needs Attention
                  </p>
                  <span className="ml-auto text-xs text-red-400/50 font-semibold">under 70%</span>
                </div>
                <div className="space-y-3">
                  {attentionList.map(s => (
                    <div key={s.student_id} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400 flex-shrink-0">
                          {AVATARS[s.avatar] ?? <FlaskConical size={12} />}
                        </div>
                        <span className="text-sm text-slate-200 truncate font-medium">{s.name}</span>
                        {activeSection === 'all' && s.class_section && (
                          <span className="text-xs text-slate-600 flex-shrink-0">{s.class_section}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-slate-600 tabular-nums">
                          {s.total_sessions} session{s.total_sessions !== 1 ? 's' : ''}
                        </span>
                        <span className="text-sm font-black text-red-400 tabular-nums w-14 text-right">
                          {Number(s.overall_accuracy).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                  {struggling > 5 && (
                    <p className="text-xs text-red-400/50 text-center pt-1">
                      + {struggling - 5} more in the student roster below
                    </p>
                  )}
                </div>
              </div>
            )}

          </div>
        )}
        {/* ── End analytics ─────────────────────────────────────────────────── */}

        {/* Student roster */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users size={14} className="text-slate-400" />
            <h2 className="text-xs font-black uppercase tracking-wider">
              {activeSection === 'all' ? 'All Students' : `Class ${activeSection}`}
            </h2>
          </div>

          {!students || students.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">
              No students yet. Share the sign-up link with your class!
            </p>
          ) : (
            <div className="space-y-1">
              {/* Column headers */}
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-3 pb-2 border-b border-slate-800">
                <span className="text-xs text-slate-600 font-semibold">Student</span>
                <span className="text-xs text-slate-600 font-semibold text-right">Acc.</span>
                <span className="text-xs text-slate-600 font-semibold text-right">XP</span>
                <span className="text-xs text-slate-600 font-semibold text-right">Streak</span>
              </div>
              {students.map((s, i) => (
                <div
                  key={s.student_id}
                  className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center px-3 py-2.5 rounded-2xl hover:bg-slate-800/40 transition-colors"
                >
                  {/* Name + avatar */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-slate-600 w-4 flex-shrink-0">
                      {i + 1}
                    </span>
                    <div className="w-7 h-7 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400 flex-shrink-0">
                      {AVATARS[s.avatar] ?? <FlaskConical size={14} />}
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-slate-200 truncate block">{s.name}</span>
                      {activeSection === 'all' && s.class_section && (
                        <span className="text-xs text-slate-600">{s.class_section}</span>
                      )}
                    </div>
                  </div>
                  {/* Accuracy */}
                  <span className={`text-xs font-mono tabular-nums font-bold ${
                    Number(s.overall_accuracy) >= 90 ? 'text-teal-400' :
                    Number(s.overall_accuracy) >= 70 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {Number(s.overall_accuracy).toFixed(1)}%
                  </span>
                  {/* XP */}
                  <span className="text-xs text-slate-400 font-mono tabular-nums">
                    ⚡{s.xp}
                  </span>
                  {/* Streak */}
                  <span className="text-xs text-slate-400 tabular-nums">
                    {s.streak_weeks > 0 ? `🔥${s.streak_weeks}w` : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sign out */}
        <form action={signOut}>
          <button className="w-full text-xs text-slate-600 hover:text-slate-400 transition-colors py-2">
            Sign out
          </button>
        </form>

      </div>
    </main>
  )
}

// ── Helper components ────────────────────────────────────────────────────────

function StatCard({
  icon, value, label, bg,
}: {
  icon: React.ReactNode
  value: string
  label: string
  bg: 'teal' | 'violet' | 'orange'
}) {
  const styles = {
    teal:   'bg-teal-500/10 border-teal-500/20',
    violet: 'bg-violet-500/10 border-violet-500/20',
    orange: 'bg-orange-500/10 border-orange-500/20',
  }[bg]

  return (
    <div className={`${styles} border rounded-2xl p-4 text-center`}>
      <div className="flex justify-center mb-1.5">{icon}</div>
      <p className="text-lg font-black text-white leading-none mb-0.5">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  )
}

function LegendItem({
  dot, label, count, total,
}: {
  dot: string
  label: string
  count: number
  total: number
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dot}`} />
      <span className="text-xs text-slate-400 flex-1 min-w-0 truncate">{label}</span>
      <span className="text-xs font-bold tabular-nums text-slate-300">{count}</span>
      <span className="text-xs text-slate-600 tabular-nums w-8 text-right">{pct}%</span>
    </div>
  )
}
