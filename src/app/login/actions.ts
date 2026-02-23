'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Students don't have real emails — we construct a deterministic fake one.
// Teachers use their real email address.
const EMAIL_DOMAIN = 'scilingoapp.internal'

function studentIdToEmail(studentId: string): string {
  return `${studentId.trim().toLowerCase()}@${EMAIL_DOMAIN}`
}

export async function login(formData: FormData) {
  try {
    const supabase   = await createClient()
    const identifier = (formData.get('identifier') as string ?? '').trim()
    const password   = formData.get('password') as string

    if (!identifier || !password) return { error: 'All fields are required.' }

    // If input looks like an email it's a teacher; otherwise treat as student ID
    const email = identifier.includes('@') ? identifier : studentIdToEmail(identifier)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }

    return { success: true }
  } catch (err) {
    console.error('[login] unexpected error:', err)
    return { error: 'Something went wrong. Try again.' }
  }
}

export async function signup(formData: FormData) {
  try {
    const studentId    = (formData.get('studentId') as string ?? '').trim()
    const name         = (formData.get('name') as string ?? '').trim()
    const password     = formData.get('password') as string
    const classSection = (formData.get('class_section') as string ?? '').trim()

    if (!studentId || !name || !password || !classSection) {
      return { error: 'All fields are required.' }
    }

    const email = studentIdToEmail(studentId)

    // Use admin client to create the user with email pre-confirmed.
    // This bypasses Supabase's email confirmation flow entirely — no email is sent.
    const admin = createAdminClient()
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (error) return { error: error.message }
    if (!data.user) return { error: 'Could not create account — try again.' }

    // Insert profile row using admin client (service role bypasses RLS insert check)
    const { error: profileError } = await admin
      .from('profiles')
      .insert({
        id:             data.user.id,
        email,
        name,
        role:           'student',
        avatar:         'flask',
        class_section:  classSection,
        student_number: studentId,
      })

    if (profileError) return { error: profileError.message }

    // Sign in immediately to establish the session cookie
    const supabase = await createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) return { error: signInError.message }

    return { success: true }
  } catch (err) {
    console.error('[signup] unexpected error:', err)
    return { error: 'Something went wrong. Try again.' }
  }
}
