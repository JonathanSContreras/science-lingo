'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Level helpers ──────────────────────────────────────────────────────────

function calcLevel(xp: number): number {
  if (xp >= 7500) return 6
  if (xp >= 4500) return 5
  if (xp >= 2500) return 4
  if (xp >= 1200) return 3
  if (xp >= 500)  return 2
  return 1
}

// ─── Record a single answer ─────────────────────────────────────────────────

export async function recordAnswer(
  sessionId: string,
  questionId: string,
  selectedOption: string,
  isCorrect: boolean,
) {
  try {
    const supabase = await createClient()

    const { error } = await supabase.from('answers').insert({
      session_id:      sessionId,
      question_id:     questionId,
      selected_option: selectedOption,
      is_correct:      isCorrect,
      attempt_number:  1,
      answered_at:     new Date().toISOString(),
    })

    if (error) return { error: error.message }
    return { success: true }
  } catch (err) {
    console.error('[recordAnswer]', err)
    return { error: 'Something went wrong.' }
  }
}

// ─── Complete session + update stats + award badges ─────────────────────────

export async function completeSession(
  sessionId: string,
  correctAnswers: number,
  totalAttempts: number,
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const accuracyScore =
      totalAttempts > 0
        ? Math.round((correctAnswers / totalAttempts) * 100)
        : 0

    // ── 1. Fetch current student stats ──
    const { data: stats } = await supabase
      .from('student_stats')
      .select('xp, level, streak_weeks, last_session_date, overall_accuracy, total_sessions')
      .eq('user_id', user.id)
      .maybeSingle()

    // ── 2. Streak logic ──
    const lastDate = stats?.last_session_date
      ? new Date(stats.last_session_date)
      : null
    const daysSinceLast = lastDate
      ? Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
      : 999
    const newStreak = lastDate && daysSinceLast <= 7
      ? (stats?.streak_weeks ?? 0) + 1
      : 1

    // ── 3. XP calculation ──
    let xpEarned = 100 // base
    if (accuracyScore === 100) xpEarned += 150        // perfect
    else if (accuracyScore >= 95) xpEarned += 100     // near-perfect
    else if (accuracyScore >= 80) xpEarned += 50      // good
    if (newStreak > 1) xpEarned += 25                 // streak bonus

    // ── 4. Mark session complete ──
    const { error: sessionError } = await supabase
      .from('sessions')
      .update({
        completed_at:   new Date().toISOString(),
        accuracy_score: accuracyScore,
        xp_earned:      xpEarned,
        correct_answers: correctAnswers,
        total_attempts:  totalAttempts,
        is_complete:    true,
      })
      .eq('id', sessionId)

    if (sessionError) return { error: sessionError.message }

    // ── 5. Update student_stats ──
    const oldTotalSessions   = stats?.total_sessions ?? 0
    const oldOverallAccuracy = Number(stats?.overall_accuracy ?? 0)
    const newTotalSessions   = oldTotalSessions + 1
    const newOverallAccuracy = Math.round(
      (oldOverallAccuracy * oldTotalSessions + accuracyScore) / newTotalSessions,
    )
    const newXp = (stats?.xp ?? 0) + xpEarned

    const { error: statsError } = await supabase
      .from('student_stats')
      .upsert(
        {
          user_id:          user.id,
          xp:               newXp,
          level:            calcLevel(newXp),
          streak_weeks:     newStreak,
          last_session_date: new Date().toISOString().split('T')[0],
          overall_accuracy: newOverallAccuracy,
          total_sessions:   newTotalSessions,
        },
        { onConflict: 'user_id' },
      )

    if (statsError) return { error: statsError.message }

    // ── 6. Badge checks ──
    await checkAndAwardBadges(
      supabase,
      user.id,
      accuracyScore,
      newStreak,
      newTotalSessions,
    )

    revalidatePath('/dashboard')
    revalidatePath('/leaderboard')
    revalidatePath('/profile')

    return { success: true, xpEarned, accuracyScore, newStreak }
  } catch (err) {
    console.error('[completeSession]', err)
    return { error: 'Something went wrong.' }
  }
}

// ─── Badge logic ────────────────────────────────────────────────────────────

// deno-lint-ignore no-explicit-any
type SupabaseAny = any // Supabase client return type is complex; intentional

async function checkAndAwardBadges(
  supabase: SupabaseAny,
  userId: string,
  accuracyScore: number,
  streak: number,
  totalSessions: number,
) {
  // Get existing badges so we don't duplicate
  const { data: existingBadges } = await supabase
    .from('badges')
    .select('badge_type')
    .eq('student_id', userId)

  const existing = new Set(
    (existingBadges ?? []).map((b: { badge_type: string }) => b.badge_type),
  )
  const toAward: string[] = []

  // 🔬 First Session
  if (totalSessions === 1 && !existing.has('first_session'))
    toAward.push('first_session')

  // ⚡ Perfectionist — 100% accuracy
  if (accuracyScore === 100 && !existing.has('perfectionist'))
    toAward.push('perfectionist')

  // 🔥 On Fire — 3-week streak
  if (streak >= 3 && !existing.has('on_fire'))
    toAward.push('on_fire')

  // 💎 Veteran — 10 total sessions
  if (totalSessions >= 10 && !existing.has('veteran'))
    toAward.push('veteran')

  // 🧠 Science Brain — 90%+ for last 3 sessions
  if (!existing.has('science_brain')) {
    const { data: recentSessions } = await supabase
      .from('sessions')
      .select('accuracy_score')
      .eq('student_id', userId)
      .eq('is_complete', true)
      .order('completed_at', { ascending: false })
      .limit(3)

    if (
      recentSessions?.length === 3 &&
      recentSessions.every((s: { accuracy_score: number | null }) => (s.accuracy_score ?? 0) >= 90)
    ) {
      toAward.push('science_brain')
    }
  }

  if (toAward.length > 0) {
    await supabase.from('badges').insert(
      toAward.map((badge_type) => ({
        student_id: userId,
        badge_type,
        earned_at: new Date().toISOString(),
      })),
    )
  }
}
