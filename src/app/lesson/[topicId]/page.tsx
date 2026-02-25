import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function LessonPage({
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

  if (profile?.role === 'teacher') redirect('/teacher')

  const [topicRes, cardsRes] = await Promise.all([
    supabase
      .from('topics')
      .select('id, title, standard')
      .eq('id', topicId)
      .single(),
    supabase
      .from('lesson_cards')
      .select('id, title, body, order_index')
      .eq('topic_id', topicId)
      .order('order_index'),
  ])

  const topic = topicRes.data
  const cards = cardsRes.data ?? []

  if (!topic || cards.length === 0) redirect('/dashboard')

  return (
    <main className="min-h-screen bg-[#060c18] text-white">
      <header className="px-4 pt-8 pb-4 max-w-lg mx-auto">
        <Link
          href="/dashboard"
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors mb-4 flex items-center gap-1"
        >
          ← Dashboard
        </Link>
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-bold text-teal-400 uppercase tracking-widest">Lesson</span>
        </div>
        <h1 className="text-2xl font-black leading-tight">{topic.title}</h1>
        {topic.standard && (
          <p className="text-xs font-mono text-slate-500 mt-1">Standard {topic.standard}</p>
        )}
      </header>

      <div className="px-4 max-w-lg mx-auto space-y-4 pb-12">
        {cards.map((card) => (
          <div
            key={card.id}
            className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5"
          >
            <p className="text-sm font-black text-teal-300 mb-2">{card.title}</p>
            <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">{card.body}</p>
          </div>
        ))}

        <Link
          href={`/session/${topicId}?mode=practice`}
          className="block w-full text-center py-4 rounded-2xl bg-teal-500 hover:bg-teal-400 active:scale-[0.98] text-slate-900 font-black text-base transition-all shadow-lg shadow-teal-500/20 mt-2"
        >
          🔬 Start Practice
        </Link>
      </div>
    </main>
  )
}
