import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, ChevronRight, CheckCircle, Circle, Plus } from 'lucide-react'
import { CreateTopicForm } from './CreateTopicForm'
import { SetActiveButton } from './SetActiveButton'

export default async function TeacherTopicsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'teacher') redirect('/dashboard')

  const { data: topics } = await supabase
    .from('topics')
    .select('id, title, standard, description, is_active, week_number, created_at')
    .order('created_at', { ascending: false })

  const { data: questionCounts } = await supabase
    .from('questions')
    .select('topic_id')

  const countMap: Record<string, number> = {}
  for (const q of questionCounts ?? []) {
    countMap[q.topic_id] = (countMap[q.topic_id] ?? 0) + 1
  }

  return (
    <main className="min-h-screen bg-[#060c18] text-white">
      <header className="px-4 pt-8 pb-4 max-w-2xl mx-auto">
        <Link
          href="/teacher"
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors mb-2 flex items-center gap-1"
        >
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-black">Topics</h1>
      </header>

      <div className="px-4 max-w-2xl mx-auto space-y-4 pb-10">

        <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Plus size={14} className="text-teal-400" />
            <h2 className="text-xs font-black uppercase tracking-wider">New Topic</h2>
          </div>
          <CreateTopicForm />
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={14} className="text-slate-400" />
            <h2 className="text-xs font-black uppercase tracking-wider">
              All Topics ({topics?.length ?? 0})
            </h2>
          </div>

          {!topics || topics.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">
              No topics yet — create your first one above!
            </p>
          ) : (
            <div className="space-y-2">
              {topics.map((topic) => {
                const qCount = countMap[topic.id] ?? 0
                return (
                  <div
                    key={topic.id}
                    className={`rounded-2xl border p-4 ${
                      topic.is_active
                        ? 'border-teal-500/30 bg-teal-500/5'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {topic.is_active
                            ? <CheckCircle size={14} className="text-teal-400 flex-shrink-0" />
                            : <Circle size={14} className="text-slate-600 flex-shrink-0" />
                          }
                          <span className="font-bold text-sm text-white">{topic.title}</span>
                          {topic.is_active && (
                            <span className="text-xs bg-teal-500/20 text-teal-400 border border-teal-500/30 px-2 py-0.5 rounded-full font-bold">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        {topic.standard && (
                          <p className="text-xs text-slate-500 font-mono ml-5">Standard {topic.standard}</p>
                        )}
                        <p className={`text-xs font-semibold mt-1.5 ml-5 ${
                          qCount >= 10 ? 'text-teal-400' :
                          qCount > 0   ? 'text-amber-400' : 'text-slate-500'
                        }`}>
                          {qCount} question{qCount !== 1 ? 's' : ''}
                          {qCount > 0 && qCount < 10 && ` · need ${10 - qCount} more`}
                          {qCount === 0 && ' · add some!'}
                          {qCount >= 10 && ' ✓ ready'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!topic.is_active && <SetActiveButton topicId={topic.id} />}
                        <Link
                          href={`/teacher/topics/${topic.id}`}
                          className="flex items-center gap-1 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-xl transition-all font-semibold"
                        >
                          Questions <ChevronRight size={12} />
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
