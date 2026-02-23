import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { QuizClient } from './QuizClient'

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
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'teacher') redirect('/teacher')

  // ── Topic + questions + student XP ──
  const [topicRes, questionsRes, statsRes] = await Promise.all([
    supabase
      .from('topics')
      .select('id, title, standard, description')
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
  ])

  const topic      = topicRes.data
  const questions  = questionsRes.data
  const studentXp  = statsRes.data?.xp ?? 0

  if (!topic)                              redirect('/dashboard')
  if (!questions || questions.length === 0) redirect('/dashboard')

  // ── Competition: redirect if already completed ──
  if (mode === 'competition') {
    const { data: completedCompetition } = await supabase
      .from('sessions')
      .select('id')
      .eq('student_id', user.id)
      .eq('topic_id', topicId)
      .eq('session_type', 'competition')
      .eq('is_complete', true)
      .maybeSingle()

    if (completedCompetition) {
      redirect(`/session/summary?session=${completedCompetition.id}`)
    }
  }

  // ── Shuffle questions for competition (server-side, one-time) ──
  const orderedQuestions = (() => {
    if (mode !== 'competition') return questions
    const shuffled = [...questions]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1)) // eslint-disable-line react-hooks/purity
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  })()

  // ── Session: reuse an in-progress same-type session or create a new one ──
  const { data: existingSession } = await supabase
    .from('sessions')
    .select('id')
    .eq('student_id', user.id)
    .eq('topic_id', topicId)
    .eq('session_type', mode)
    .eq('is_complete', false)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let sessionId: string

  if (existingSession) {
    sessionId = existingSession.id
  } else {
    const { data: newSession, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        student_id:      user.id,
        topic_id:        topicId,
        started_at:      new Date().toISOString(),
        is_complete:     false,
        correct_answers: 0,
        total_attempts:  0,
        session_type:    mode,
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
    />
  )
}
