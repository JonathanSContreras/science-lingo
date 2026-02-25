'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createTopic(formData: FormData) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { error } = await supabase.from('topics').insert({
      title:       formData.get('title')       as string,
      standard:    formData.get('standard')    as string || null,
      description: formData.get('description') as string || null,
      week_number: formData.get('week_number') ? Number(formData.get('week_number')) : null,
      created_by:  user.id,
      is_active:   false,
    })

    if (error) return { error: error.message }
    revalidatePath('/teacher/topics')
    return { success: true }
  } catch (err) {
    console.error('[createTopic]', err)
    return { error: 'Something went wrong.' }
  }
}

export async function setTopicActive(topicId: string) {
  try {
    const supabase = await createClient()

    // Deactivate all topics first, then activate the selected one
    await supabase.from('topics').update({ is_active: false }).neq('id', topicId)
    const { error } = await supabase.from('topics').update({ is_active: true }).eq('id', topicId)

    if (error) return { error: error.message }
    revalidatePath('/teacher/topics')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err) {
    console.error('[setTopicActive]', err)
    return { error: 'Something went wrong.' }
  }
}

export async function addQuestion(formData: FormData) {
  try {
    const supabase = await createClient()

    const { error } = await supabase.from('questions').insert({
      topic_id:       formData.get('topic_id')       as string,
      question_text:  formData.get('question_text')  as string,
      option_a:       formData.get('option_a')       as string,
      option_b:       formData.get('option_b')       as string,
      option_c:       formData.get('option_c')       as string,
      option_d:       formData.get('option_d')       as string,
      correct_option: formData.get('correct_option') as string,
      explanation:    formData.get('explanation')    as string,
      hint:           formData.get('hint')           as string || null,
      order_index:    Number(formData.get('order_index') ?? 0),
    })

    if (error) return { error: error.message }
    revalidatePath(`/teacher/topics/${formData.get('topic_id')}`)
    return { success: true }
  } catch (err) {
    console.error('[addQuestion]', err)
    return { error: 'Something went wrong.' }
  }
}

export async function updateQuestion(questionId: string, topicId: string, formData: FormData) {
  try {
    const supabase = await createClient()

    const { error } = await supabase.from('questions').update({
      question_text:  formData.get('question_text')  as string,
      option_a:       formData.get('option_a')       as string,
      option_b:       formData.get('option_b')       as string,
      option_c:       formData.get('option_c')       as string,
      option_d:       formData.get('option_d')       as string,
      correct_option: formData.get('correct_option') as string,
      explanation:    formData.get('explanation')    as string,
      hint:           formData.get('hint')           as string || null,
    }).eq('id', questionId)

    if (error) return { error: error.message }
    revalidatePath(`/teacher/topics/${topicId}`)
    return { success: true }
  } catch (err) {
    console.error('[updateQuestion]', err)
    return { error: 'Something went wrong.' }
  }
}

export async function bulkAddQuestions(
  topicId: string,
  questions: Array<{
    question_text:  string
    option_a:       string
    option_b:       string
    option_c:       string
    option_d:       string
    correct_option: string
    explanation:    string
    hint:           string
  }>,
  startOrderIndex: number,
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const rows = questions.map((q, i) => ({
      topic_id:       topicId,
      question_text:  q.question_text,
      option_a:       q.option_a,
      option_b:       q.option_b,
      option_c:       q.option_c,
      option_d:       q.option_d,
      correct_option: q.correct_option,
      explanation:    q.explanation,
      hint:           q.hint || null,
      order_index:    startOrderIndex + i,
    }))

    const { error } = await supabase.from('questions').insert(rows)
    if (error) return { error: error.message }

    revalidatePath(`/teacher/topics/${topicId}`)
    return { success: true }
  } catch (err) {
    console.error('[bulkAddQuestions]', err)
    return { error: 'Something went wrong.' }
  }
}

export async function updateCompetitionLimit(topicId: string, limit: number | null) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { error } = await supabase
      .from('topics')
      .update({ competition_limit: limit })
      .eq('id', topicId)

    if (error) return { error: error.message }
    revalidatePath(`/teacher/topics/${topicId}`)
    return { success: true }
  } catch (err) {
    console.error('[updateCompetitionLimit]', err)
    return { error: 'Something went wrong.' }
  }
}

const ALL_SECTIONS = ['8A', '8B', '8C', '8D', '8E', '8F'] as const

export async function openCompetition(topicId: string, classSection: string) {
  try {
    const supabase = await createClient()

    const { data: existing } = await supabase
      .from('competition_rounds')
      .select('round_number')
      .eq('topic_id', topicId)
      .eq('class_section', classSection)
      .maybeSingle()

    const { error } = await supabase
      .from('competition_rounds')
      .upsert(
        { topic_id: topicId, class_section: classSection, is_open: true, round_number: (existing?.round_number ?? 0) + 1 },
        { onConflict: 'topic_id,class_section' },
      )

    if (error) return { error: error.message }
    revalidatePath(`/teacher/topics/${topicId}`)
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err) {
    console.error('[openCompetition]', err)
    return { error: 'Something went wrong.' }
  }
}

export async function closeCompetition(topicId: string, classSection: string) {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('competition_rounds')
      .update({ is_open: false })
      .eq('topic_id', topicId)
      .eq('class_section', classSection)

    if (error) return { error: error.message }
    revalidatePath(`/teacher/topics/${topicId}`)
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err) {
    console.error('[closeCompetition]', err)
    return { error: 'Something went wrong.' }
  }
}

export async function openAllCompetitions(topicId: string) {
  try {
    const supabase = await createClient()

    const { data: existing } = await supabase
      .from('competition_rounds')
      .select('class_section, round_number')
      .eq('topic_id', topicId)

    const existingMap = new Map(existing?.map((r) => [r.class_section, r.round_number]) ?? [])

    const rows = ALL_SECTIONS.map((section) => ({
      topic_id:      topicId,
      class_section: section,
      is_open:       true,
      round_number:  (existingMap.get(section) ?? 0) + 1,
    }))

    const { error } = await supabase
      .from('competition_rounds')
      .upsert(rows, { onConflict: 'topic_id,class_section' })

    if (error) return { error: error.message }
    revalidatePath(`/teacher/topics/${topicId}`)
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err) {
    console.error('[openAllCompetitions]', err)
    return { error: 'Something went wrong.' }
  }
}

export async function closeAllCompetitions(topicId: string) {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('competition_rounds')
      .update({ is_open: false })
      .eq('topic_id', topicId)

    if (error) return { error: error.message }
    revalidatePath(`/teacher/topics/${topicId}`)
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err) {
    console.error('[closeAllCompetitions]', err)
    return { error: 'Something went wrong.' }
  }
}

export async function deleteQuestion(questionId: string, topicId: string) {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('questions').delete().eq('id', questionId)
    if (error) return { error: error.message }
    revalidatePath(`/teacher/topics/${topicId}`)
    return { success: true }
  } catch (err) {
    console.error('[deleteQuestion]', err)
    return { error: 'Something went wrong.' }
  }
}

export async function addLessonCard(topicId: string, title: string, body: string, orderIndex: number) {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('lesson_cards').insert({
      topic_id:    topicId,
      title,
      body,
      order_index: orderIndex,
    })
    if (error) return { error: error.message }
    revalidatePath(`/teacher/topics/${topicId}`)
    return { success: true }
  } catch (err) {
    console.error('[addLessonCard]', err)
    return { error: 'Something went wrong.' }
  }
}

export async function deleteLessonCard(cardId: string, topicId: string) {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('lesson_cards').delete().eq('id', cardId)
    if (error) return { error: error.message }
    revalidatePath(`/teacher/topics/${topicId}`)
    return { success: true }
  } catch (err) {
    console.error('[deleteLessonCard]', err)
    return { error: 'Something went wrong.' }
  }
}
