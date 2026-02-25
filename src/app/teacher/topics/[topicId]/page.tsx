import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { List } from 'lucide-react'
import { AddQuestionForm } from './AddQuestionForm'
import { QuestionCard } from './QuestionCard'
import { CompetitionLimitForm } from './CompetitionLimitForm'
import { BulkImportForm } from './BulkImportForm'
import { CompetitionRoundControl } from './CompetitionRoundControl'
import { LessonCardForm } from './LessonCardForm'
import { LessonCardItem } from './LessonCardItem'

export default async function TopicQuestionsPage({
  params,
}: {
  params: Promise<{ topicId: string }>
}) {
  const { topicId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'teacher') redirect('/dashboard')

  const ALL_SECTIONS = ['8A', '8B', '8C', '8D', '8E', '8F']

  const [topicRes, questionsRes, roundsRes, lessonCardsRes] = await Promise.all([
    supabase
      .from('topics')
      .select('id, title, standard, is_active, competition_limit')
      .eq('id', topicId)
      .single(),
    supabase
      .from('questions')
      .select('id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, hint, order_index')
      .eq('topic_id', topicId)
      .order('order_index'),
    supabase
      .from('competition_rounds')
      .select('class_section, is_open, round_number')
      .eq('topic_id', topicId),
    supabase
      .from('lesson_cards')
      .select('id, title, body, order_index')
      .eq('topic_id', topicId)
      .order('order_index'),
  ])

  const topic       = topicRes.data
  const questions   = questionsRes.data ?? []
  const lessonCards = lessonCardsRes.data ?? []

  if (!topic) redirect('/teacher/topics')

  // Merge DB rows with all 6 sections (fill missing with defaults)
  const roundMap = new Map((roundsRes.data ?? []).map((r) => [r.class_section, r]))
  const rounds = ALL_SECTIONS.map(
    (s) => roundMap.get(s) ?? { class_section: s, is_open: false, round_number: 0 },
  )

  const nextOrderIndex = questions.length

  return (
    <main className="min-h-screen bg-[#060c18] text-white">
      <header className="px-4 pt-8 pb-4 max-w-2xl mx-auto">
        <Link
          href="/teacher/topics"
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors mb-2 flex items-center gap-1"
        >
          ← Topics
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black">{topic.title}</h1>
          {topic.is_active && (
            <span className="text-xs bg-teal-500/20 text-teal-400 border border-teal-500/30 px-2 py-1 rounded-full font-bold">
              ACTIVE
            </span>
          )}
        </div>
        {topic.standard && (
          <p className="text-xs text-slate-500 font-mono mt-1">Standard {topic.standard}</p>
        )}
      </header>

      <div className="px-4 max-w-2xl mx-auto space-y-4 pb-10">

        {/* Pool status */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                questions.length >= 10 ? 'bg-teal-500' : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min((questions.length / Math.max(questions.length, 20)) * 100, 100)}%` }}
            />
          </div>
          <span className={`text-xs font-bold tabular-nums ${
            questions.length >= 10 ? 'text-teal-400' : 'text-amber-400'
          }`}>
            {questions.length} question{questions.length !== 1 ? 's' : ''} in pool
            {questions.length < 10
              ? ` · need ${10 - questions.length} more`
              : ' ✓'}
          </span>
        </div>

        {/* Add question form */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5">
          <h2 className="text-xs font-black uppercase tracking-wider mb-4 text-teal-400">
            + Add Question
          </h2>
          <AddQuestionForm topicId={topicId} orderIndex={nextOrderIndex} />
        </div>

        {/* Bulk import */}
        <BulkImportForm topicId={topicId} startOrderIndex={nextOrderIndex} />

        {/* Mini Lesson */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5">
          <h2 className="text-xs font-black uppercase tracking-wider mb-1 text-teal-400">
            📖 Mini Lesson
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Add cards that students can read before or during a session. Each card has a title and body.
          </p>
          <LessonCardForm topicId={topicId} nextOrderIndex={lessonCards.length} />
          {lessonCards.length > 0 && (
            <div className="mt-5 space-y-3">
              {lessonCards.map((card) => (
                <LessonCardItem key={card.id} card={card} topicId={topicId} />
              ))}
            </div>
          )}
        </div>

        {/* Competition round control */}
        <CompetitionRoundControl
          topicId={topicId}
          rounds={rounds}
        />

        {/* Competition settings */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5">
          <h2 className="text-xs font-black uppercase tracking-wider mb-1 text-amber-400">
            Competition Cap
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Practice always picks <span className="text-white font-bold">10 random</span> questions.
            Competition uses{' '}
            <span className="text-white font-bold">
              {topic.competition_limit ? `up to ${topic.competition_limit}` : 'all'}
            </span>{' '}
            from the pool.
          </p>
          <CompetitionLimitForm
            topicId={topicId}
            currentLimit={topic.competition_limit ?? null}
            poolSize={questions.length}
          />
        </div>

        {/* Question list */}
        {questions.length > 0 && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <List size={14} className="text-slate-400" />
              <h2 className="text-xs font-black uppercase tracking-wider">
                Questions ({questions.length})
              </h2>
            </div>
            <div className="space-y-3">
              {questions.map((q, i) => (
                <QuestionCard key={q.id} question={q} index={i} topicId={topicId} />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
