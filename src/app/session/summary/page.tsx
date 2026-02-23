import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Trophy, Zap, Flame, Target, ChevronRight, CheckCircle2, XCircle, BookOpen } from 'lucide-react'

// ─── Level helpers ───────────────────────────────────────────────────────────

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

const OPTION_KEYS = ['option_a', 'option_b', 'option_c', 'option_d'] as const
const OPTION_LABELS = ['A', 'B', 'C', 'D']

type QuestionDetail = {
  id: string
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_option: string
  explanation: string
}

type AnswerRow = {
  selected_option: string
  is_correct: boolean
  questions: QuestionDetail | null
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

  const isPractice = session.session_type === 'practice'

  // Fetch answers, then fetch their questions separately (avoids FK join dependency)
  const { data: rawAnswers } = await supabase
    .from('answers')
    .select('selected_option, is_correct, question_id')
    .eq('session_id', sessionId)

  const questionIds = (rawAnswers ?? []).map((a: { question_id: string }) => a.question_id)

  const { data: rawQuestions } = questionIds.length > 0
    ? await supabase
        .from('questions')
        .select('id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation')
        .in('id', questionIds)
    : { data: [] }

  const questionsMap = Object.fromEntries(
    (rawQuestions ?? []).map((q: QuestionDetail & { id: string }) => [q.id, q])
  )

  const answers: AnswerRow[] = (rawAnswers ?? []).map((a: {
    selected_option: string
    is_correct: boolean
    question_id: string
  }) => ({
    selected_option: a.selected_option,
    is_correct:      a.is_correct,
    questions:       questionsMap[a.question_id] ?? null,
  }))

  const accuracy    = session.accuracy_score ?? 0
  const xpEarned    = session.xp_earned ?? 0
  const topicId     = session.topic_id as string
  const topicTitle  = (session.topics as { title?: string } | null)?.title ?? 'Science Lingo'
  const topicStd    = (session.topics as { standard?: string } | null)?.standard
  const highlight   = getHighlight(accuracy)

  // Competition-only data
  const [statsRes, boardRes] = isPractice
    ? [{ data: null }, { data: [] }]
    : await Promise.all([
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

  const stats     = statsRes.data
  const board     = (boardRes.data ?? []) as { student_id: string; rank: number }[]
  const myRankRow = board.find((r) => r.student_id === user.id)
  const myRank    = myRankRow?.rank ?? 0

  const streak     = stats?.streak_weeks ?? 1
  const totalXp    = stats?.xp ?? 0
  const levelTitle = getLevelTitle(totalXp)

  const xpParts: string[] = ['100 base']
  if (accuracy === 100)     xpParts.push('+150 perfect')
  else if (accuracy >= 95)  xpParts.push('+100 near-perfect')
  else if (accuracy >= 80)  xpParts.push('+50 accuracy bonus')
  if (streak > 1)           xpParts.push('+25 streak')

  const practiceXpParts: string[] = ['50 base']
  if (accuracy === 100)     practiceXpParts.push('+75 perfect')
  else if (accuracy >= 95)  practiceXpParts.push('+50 near-perfect')
  else if (accuracy >= 80)  practiceXpParts.push('+25 accuracy bonus')

  return (
    <main className="min-h-screen bg-[#060c18] text-white pb-12">
      <div className="flex flex-col items-center p-4 relative overflow-hidden">

        {/* Background blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-teal-500/5 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-500/5 blur-[120px]" />
        </div>

        <div className="relative w-full max-w-sm">

          {/* ── Hero ── */}
          <div className="text-center mb-6 pt-8">
            <div className="text-6xl mb-4 animate-bounce">
              {isPractice ? '🔬' : accuracy === 100 ? '🏆' : accuracy >= 80 ? '🌟' : '🔬'}
            </div>
            <h1 className="text-3xl font-black text-white">
              {isPractice ? 'Practice Complete!' : 'Session Complete!'}
            </h1>
            <p className="text-slate-400 text-sm mt-1 font-medium">{topicTitle}</p>
            {topicStd && (
              <p className="text-slate-600 text-xs mt-0.5 font-mono">Standard {topicStd}</p>
            )}
            {isPractice && (
              <p className="text-slate-500 text-xs mt-2">
                Practice round · reduced XP earned
              </p>
            )}
          </div>

          {/* ── Highlight pill ── */}
          <div className="text-center mb-6">
            <span className="inline-block bg-teal-500/15 border border-teal-500/30 text-teal-300 text-sm font-black px-5 py-2 rounded-full">
              {highlight}
            </span>
          </div>

          {/* ── Stats card ── */}
          {isPractice ? (
            // Practice: accuracy + correct count + XP earned
            <div className="bg-slate-900/80 border border-slate-700/60 rounded-3xl p-5 shadow-2xl mb-4">
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-slate-800/60 rounded-2xl p-3 text-center border border-slate-700/40">
                  <Target size={16} className="text-teal-400 mx-auto mb-1.5" />
                  <div className={`text-2xl font-black ${
                    accuracy === 100 ? 'text-amber-400' :
                    accuracy >= 80  ? 'text-emerald-400' :
                    accuracy >= 60  ? 'text-white' : 'text-red-400'
                  }`}>
                    {accuracy}%
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Accuracy</div>
                </div>
                <div className="bg-slate-800/60 rounded-2xl p-3 text-center border border-slate-700/40">
                  <div className="text-2xl font-black text-white mt-[22px]">
                    {session.correct_answers}/{session.total_attempts}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Correct</div>
                </div>
                <div className="bg-slate-800/60 rounded-2xl p-3 text-center border border-slate-700/40">
                  <Zap size={16} className="text-amber-400 mx-auto mb-1.5" />
                  <div className="text-2xl font-black text-amber-400">+{xpEarned}</div>
                  <div className="text-xs text-slate-500 mt-1">XP Earned</div>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-700/40">
                <p className="text-xs text-slate-600 text-center">
                  {practiceXpParts.join(' · ')}
                </p>
              </div>
            </div>
          ) : (
            // Competition: full stats grid
            <div className="bg-slate-900/80 border border-slate-700/60 rounded-3xl p-5 shadow-2xl mb-4">
              <div className="grid grid-cols-2 gap-3 mb-4">

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

                <div className="bg-slate-800/60 rounded-2xl p-4 text-center border border-slate-700/40">
                  <Zap size={18} className="text-amber-400 mx-auto mb-2" />
                  <div className="text-3xl font-black text-amber-400">+{xpEarned}</div>
                  <div className="text-xs text-slate-500 mt-1">XP Earned</div>
                </div>

                <div className="bg-slate-800/60 rounded-2xl p-4 text-center border border-slate-700/40">
                  <Flame size={18} className="text-orange-400 mx-auto mb-2" />
                  <div className="text-3xl font-black text-orange-400">{streak}</div>
                  <div className="text-xs text-slate-500 mt-1">Week Streak</div>
                </div>

                <div className="bg-slate-800/60 rounded-2xl p-4 text-center border border-slate-700/40">
                  <Trophy size={18} className="text-violet-400 mx-auto mb-2" />
                  <div className="text-3xl font-black text-violet-400">
                    {myRank > 0 ? `#${myRank}` : '—'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Class Rank</div>
                </div>
              </div>

              <div className="flex items-center justify-between px-1 text-xs text-slate-500">
                <span>{session.correct_answers}/{session.total_attempts} correct</span>
                <span>{levelTitle} · {totalXp.toLocaleString()} XP total</span>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-700/40">
                <p className="text-xs text-slate-600 text-center">
                  {xpParts.join(' · ')}
                </p>
              </div>
            </div>
          )}

          {/* ── Question Breakdown ── */}
          {answers.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen size={14} className="text-slate-400" />
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                  Question Breakdown
                </h2>
              </div>
              <div className="space-y-3">
                {answers.map((answer, i) => {
                  const q = answer.questions
                  if (!q) return null
                  const correctKey  = `option_${q.correct_option}` as typeof OPTION_KEYS[number]
                  // selected_option stored as 'a'/'b'/'c'/'d' in DB, convert back to key
                  const selectedKey = `option_${answer.selected_option}` as typeof OPTION_KEYS[number]
                  const correctIdx  = OPTION_KEYS.indexOf(correctKey)
                  const selectedIdx = OPTION_KEYS.indexOf(selectedKey)

                  return (
                    <div
                      key={i}
                      className={`rounded-2xl border p-4 ${
                        answer.is_correct
                          ? 'bg-emerald-500/8 border-emerald-500/25'
                          : 'bg-red-500/8 border-red-500/20'
                      }`}
                    >
                      {/* Question header */}
                      <div className="flex items-start gap-2 mb-3">
                        {answer.is_correct ? (
                          <CheckCircle2 size={16} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                        ) : (
                          <XCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                        )}
                        <p className="text-sm font-semibold text-slate-200 leading-snug">
                          <span className="text-slate-500 font-bold mr-1">Q{i + 1}.</span>
                          {q.question_text}
                        </p>
                      </div>

                      {/* Answer pills */}
                      <div className="space-y-1.5 mb-3">
                        {/* What they answered */}
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
                          answer.is_correct
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-red-500/15 text-red-300'
                        }`}>
                          <span className="font-black w-4">{OPTION_LABELS[selectedIdx]}</span>
                          <span className="flex-1">{q[selectedKey]}</span>
                          <span className="text-xs opacity-70">
                            {answer.is_correct ? 'Your answer ✓' : 'Your answer'}
                          </span>
                        </div>

                        {/* Correct answer (only if wrong) */}
                        {!answer.is_correct && (
                          <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-emerald-500/15 text-emerald-300">
                            <span className="font-black w-4">{OPTION_LABELS[correctIdx]}</span>
                            <span className="flex-1">{q[correctKey]}</span>
                            <span className="text-xs opacity-70">Correct answer</span>
                          </div>
                        )}
                      </div>

                      {/* Explanation */}
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {q.explanation}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── CTAs ── */}
          <div className="space-y-3">
            {isPractice ? (
              <>
                <Link
                  href={`/session/${topicId}?mode=competition`}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-900 font-black text-base transition-all shadow-lg shadow-amber-500/20"
                >
                  🏆 Take the Competition Round
                  <ChevronRight size={18} />
                </Link>
                <Link
                  href={`/session/${topicId}?mode=practice`}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-sm transition-all border border-slate-700/50"
                >
                  🔬 Practice Again
                </Link>
                <Link
                  href="/dashboard"
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-slate-500 hover:text-slate-300 font-medium text-sm transition-all"
                >
                  Back to Dashboard
                </Link>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>

        </div>
      </div>
    </main>
  )
}
