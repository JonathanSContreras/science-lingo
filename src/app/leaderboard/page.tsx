import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  FlaskConical, Atom, Microscope, Rocket, Star,
  Trophy, Flame, ArrowLeft, Target, Zap,
} from 'lucide-react'

// ─── Constants ───────────────────────────────────────────────────────────────

const SECTIONS = ['8A', '8B', '8C', '8D', '8E', '8F'] as const
type Section = typeof SECTIONS[number]

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

// ─── Types ───────────────────────────────────────────────────────────────────

type BoardEntry = {
  student_id:       string
  name:             string
  avatar:           string
  class_section:    string | null
  overall_accuracy: number
  xp:               number
  streak_weeks:     number
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>
}) {
  const { section: sectionParam } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, class_section')
    .eq('id', user.id)
    .single()

  const isTeacher = profile?.role === 'teacher'

  // Teacher: use ?section= param (default 'all')
  // Student: always use their own section
  const activeSection: string = isTeacher
    ? (sectionParam ?? 'all')
    : (profile?.class_section ?? 'all')

  // Build query — filter by section when applicable
  const query = supabase
    .from('leaderboard')
    .select('student_id, name, avatar, class_section, overall_accuracy, xp, streak_weeks')
    .order('overall_accuracy', { ascending: false })
    .order('xp', { ascending: false })

  const { data: board } = activeSection !== 'all'
    ? await query.eq('class_section', activeSection)
    : await query

  const entries = (board ?? []) as BoardEntry[]

  // Derive rank from position in filtered list (not global DB rank)
  const myIndex  = entries.findIndex((e) => e.student_id === user.id)
  const myRank   = myIndex >= 0 ? myIndex + 1 : null
  const top3     = entries.slice(0, 3)
  const backHref = isTeacher ? '/teacher' : '/dashboard'

  // Label shown in header
  const sectionLabel = activeSection === 'all' ? 'All Classes' : `Class ${activeSection}`

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
            <p className="text-xs text-slate-500">
              {myRank ? `You're ranked #${myRank}` : 'Ranked by overall accuracy'}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 max-w-lg mx-auto">

        {/* ── Teacher section tabs ── */}
        {isTeacher && (
          <div className="flex gap-1.5 flex-wrap mb-5">
            {(['all', ...SECTIONS] as const).map((s) => {
              const isActive = activeSection === s
              const href = s === 'all' ? '/leaderboard' : `/leaderboard?section=${s}`
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
        )}

        {/* ── Student section badge ── */}
        {!isTeacher && profile?.class_section && (
          <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/25 text-teal-300 text-xs font-bold px-3 py-1.5 rounded-full mb-5">
            <Trophy size={11} className="text-teal-400" />
            Class {profile.class_section} Rankings
          </div>
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
                <div className="w-full h-16 bg-slate-700 rounded-xl flex flex-col items-center justify-center">
                  <span className="text-sm font-black text-white">{Number(top3[1].overall_accuracy).toFixed(1)}%</span>
                  <span className="text-xs text-slate-400">⚡{top3[1].xp}</span>
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
                <div className="w-full h-24 bg-gradient-to-t from-amber-700 to-amber-500 rounded-xl flex flex-col items-center justify-center shadow-lg shadow-amber-500/20">
                  <span className="text-sm font-black text-slate-900">{Number(top3[0].overall_accuracy).toFixed(1)}%</span>
                  <span className="text-xs text-amber-900/80 font-bold">⚡{top3[0].xp}</span>
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
                <div className="w-full h-12 bg-slate-600 rounded-xl flex flex-col items-center justify-center">
                  <span className="text-sm font-black text-white">{Number(top3[2].overall_accuracy).toFixed(1)}%</span>
                  <span className="text-xs text-slate-400">⚡{top3[2].xp}</span>
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
              <span className="flex items-center gap-1"><Target size={10} />Acc</span>
              <span className="flex items-center gap-1"><Zap size={10} />XP</span>
              <span className="flex items-center gap-1"><Flame size={10} />Str</span>
            </div>
          </div>
        )}

        {/* ── Full list ── */}
        {entries.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🚀</div>
            <p className="text-slate-400 font-bold">No scores yet</p>
            <p className="text-slate-600 text-sm mt-1">Be the first on the board!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, i) => {
              const isMe = entry.student_id === user.id
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
                    <span className="text-xs font-black text-white tabular-nums w-10 text-right">
                      {Number(entry.overall_accuracy).toFixed(1)}%
                    </span>
                    <span className="text-xs font-bold text-amber-400 tabular-nums w-10 text-right">
                      {entry.xp.toLocaleString()}
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
