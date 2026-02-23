import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { QuizClient } from './QuizClient'

export default async function SessionPage({
  params,
}: {
  params: Promise<{ topicId: string }>
}) {
  const { topicId } = await params
  const supabase    = await createClient()

  // ── Auth ──
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'teacher') redirect('/teacher')

  // ── Topic + questions ──
  const [topicRes, questionsRes] = await Promise.all([
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
  ])

  const topic     = topicRes.data
  const questions = questionsRes.data

  if (!topic)                         redirect('/dashboard')
  if (!questions || questions.length === 0) redirect('/dashboard')

  // ── Session: reuse an in-progress one or create a new one ──
  const { data: existingSession } = await supabase
    .from('sessions')
    .select('id')
    .eq('student_id', user.id)
    .eq('topic_id', topicId)
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
      questions={questions}
    />
  )
}
