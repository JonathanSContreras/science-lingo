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
