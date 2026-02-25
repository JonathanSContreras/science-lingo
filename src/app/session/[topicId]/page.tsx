import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { QuizClient } from './QuizClient'

// Fisher-Yates shuffle + slice — picks n random items from arr
function pickRandom<T>(arr: T[], n: number): T[] {
  const pool = [...arr]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, Math.min(n, pool.length))
}

export default async function SessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ topicId: string }>
  searchParams: Promise<{ mode?: string }>
}) {
  const { topicId }      = await params
  const { mode: modeParam } = await searchParams
  const mode = (modeParam === 'practice' ? 'practice' : 'competition') as 'practice' | 'competition'

  const supabase = await createClient()

  // ── Auth ──
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, class_section')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'teacher') redirect('/teacher')

  // ── Topic + questions + student XP + lesson cards ──
  const [topicRes, questionsRes, statsRes, lessonCardsRes] = await Promise.all([
    supabase
      .from('topics')
      .select('id, title, standard, description, competition_limit')
      .eq('id', topicId)
      .single(),
    supabase
      .from('questions')
      .select('id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, hint, order_index')
      .eq('topic_id', topicId)
      .order('order_index'),
    supabase
      .from('student_stats')
      .select('xp')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('lesson_cards')
      .select('id, title, body, order_index')
      .eq('topic_id', topicId)
      .order('order_index'),
  ])

  const topic       = topicRes.data
  const questions   = questionsRes.data
  const studentXp   = statsRes.data?.xp ?? 0
  const lessonCards = lessonCardsRes.data ?? []

  if (!topic)                              redirect('/dashboard')
  if (!questions || questions.length === 0) redirect('/dashboard')

  // ── Competition: fetch per-class round state ──
  const classSection = (profile as { class_section?: string | null })?.class_section ?? null

  const { data: roundRow } = classSection
    ? await supabase
        .from('competition_rounds')
        .select('is_open, round_number')
        .eq('topic_id', topicId)
        .eq('class_section', classSection)
        .maybeSingle()
    : { data: null }

  const competitionOpen  = roundRow?.is_open       ?? false
  const competitionRound = roundRow?.round_number   ?? 0

  // ── Competition: gate on open round ──
  if (mode === 'competition') {
    if (!competitionOpen) redirect('/dashboard')

    const { data: completedCompetition } = await supabase
      .from('sessions')
      .select('id')
      .eq('student_id', user.id)
      .eq('topic_id', topicId)
      .eq('session_type', 'competition')
      .eq('competition_round', competitionRound)
      .eq('is_complete', true)
      .maybeSingle()

    if (completedCompetition) {
      redirect(`/session/summary?session=${completedCompetition.id}`)
    }
  }

  // ── Session: reuse an in-progress same-type session or create a new one ──
  const existingSessionQuery = supabase
    .from('sessions')
    .select('id, question_ids')
    .eq('student_id', user.id)
    .eq('topic_id', topicId)
    .eq('session_type', mode)
    .eq('is_complete', false)
    .order('started_at', { ascending: false })
    .limit(1)

  const { data: existingSession } = await (
    mode === 'competition'
      ? existingSessionQuery.eq('competition_round', competitionRound)
      : existingSessionQuery
  ).maybeSingle()

  let sessionId: string
  let orderedQuestions: NonNullable<typeof questions>

  if (existingSession) {
    sessionId = existingSession.id
    const savedIds = existingSession.question_ids as string[] | null
    if (savedIds?.length) {
      // Restore the exact question order saved when the session was created
      orderedQuestions = savedIds
        .map((id) => questions!.find((q) => q.id === id))
        .filter(Boolean) as typeof questions
    } else {
      // Backward compat: sessions created before question pools
      orderedQuestions = questions!.slice(0, mode === 'practice' ? 10 : questions!.length)
    }
  } else {
    // New session — pick questions from the pool
    const competitionLimit =
      (topic as { competition_limit?: number | null }).competition_limit ?? null
    const count = mode === 'practice' ? 10 : (competitionLimit ?? questions!.length)
    orderedQuestions = pickRandom(questions!, count)

    const { data: newSession, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        student_id:        user.id,
        topic_id:          topicId,
        started_at:        new Date().toISOString(),
        is_complete:       false,
        correct_answers:   0,
        total_attempts:    0,
        session_type:      mode,
        question_ids:      orderedQuestions.map((q) => q.id),
        competition_round: mode === 'competition' ? competitionRound : null,
      })
      .select('id')
      .single()

    if (sessionError || !newSession) {
      console.error('[session/page] failed to create session:', sessionError)
      redirect('/dashboard')
    }

    sessionId = newSession.id
  }

  return (
    <QuizClient
      sessionId={sessionId}
      topic={topic}
      questions={orderedQuestions}
      mode={mode}
      studentXp={studentXp}
      lessonCards={lessonCards}
    />
  )
}
