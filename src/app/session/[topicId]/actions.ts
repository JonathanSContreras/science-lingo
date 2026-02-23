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
      selected_option: selectedOption.replace('option_', ''),
      is_correct:      isCorrect,
      attempt_number:  1,
    })

    if (error) return { error: error.message }
    return { success: true }
  } catch (err) {
    console.error('[recordAnswer] exception:', err)
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

    // ── 0. Check session type ──
    const { data: sessionData } = await supabase
      .from('sessions')
      .select('session_type, power_ups')
      .eq('id', sessionId)
      .single()

    const isPractice = sessionData?.session_type === 'practice'
    const powerUps   = (sessionData?.power_ups ?? []) as string[]

    if (isPractice) {
      // Practice: award reduced XP (no streak, stats, or badges)
      let practiceXp = 50
      if (accuracyScore === 100)     practiceXp += 75
      else if (accuracyScore >= 95)  practiceXp += 50
      else if (accuracyScore >= 80)  practiceXp += 25

      const { error: practiceError } = await supabase
        .from('sessions')
        .update({
          completed_at:    new Date().toISOString(),
          accuracy_score:  accuracyScore,
          xp_earned:       practiceXp,
          correct_answers: correctAnswers,
          total_attempts:  totalAttempts,
          is_complete:     true,
        })
        .eq('id', sessionId)

      if (practiceError) return { error: practiceError.message }

      // Update XP and level only — do not touch streak, overall_accuracy, or total_sessions
      const { data: practiceStats } = await supabase
        .from('student_stats')
        .select('xp, level, streak_weeks, last_session_date, overall_accuracy, total_sessions')
        .eq('user_id', user.id)
        .maybeSingle()

      const newPracticeXp = (practiceStats?.xp ?? 0) + practiceXp
      await supabase
        .from('student_stats')
        .upsert(
          {
            user_id:           user.id,
            xp:                newPracticeXp,
            level:             calcLevel(newPracticeXp),
            streak_weeks:      practiceStats?.streak_weeks ?? 0,
            last_session_date: practiceStats?.last_session_date ?? null,
            overall_accuracy:  practiceStats?.overall_accuracy ?? 0,
            total_sessions:    practiceStats?.total_sessions ?? 0,
          },
          { onConflict: 'user_id' },
        )

      revalidatePath('/dashboard')
      revalidatePath('/profile')
      return { success: true, xpEarned: practiceXp, accuracyScore, newStreak: 0 }
    }

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
    const hasStreakShield = powerUps.includes('streak_shield')
    const newStreak =
      lastDate && daysSinceLast <= 7
        ? (stats?.streak_weeks ?? 0) + 1
        : hasStreakShield && daysSinceLast > 7
          ? (stats?.streak_weeks ?? 1)
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

  // 🧠 Science Brain — 90%+ for last 3 competition sessions
  if (!existing.has('science_brain')) {
    const { data: recentSessions } = await supabase
      .from('sessions')
      .select('accuracy_score')
      .eq('student_id', userId)
      .eq('is_complete', true)
      .eq('session_type', 'competition')
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

// ─── Purchase power-ups before a competition session ────────────────────────

const POWER_UP_COSTS: Record<string, number> = {
  fifty_fifty:   75,
  hint_pass:     50,
  streak_shield: 100,
}

export async function purchasePowerUps(sessionId: string, powerUps: string[]) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const cost = powerUps.reduce((sum, pu) => sum + (POWER_UP_COSTS[pu] ?? 0), 0)

    const { data: stats } = await supabase
      .from('student_stats')
      .select('xp')
      .eq('user_id', user.id)
      .maybeSingle()

    const currentXp = stats?.xp ?? 0
    if (currentXp < cost) return { error: 'Not enough XP' }

    const newXp = currentXp - cost

    const [statsRes, sessionRes] = await Promise.all([
      supabase
        .from('student_stats')
        .update({ xp: newXp, level: calcLevel(newXp) })
        .eq('user_id', user.id),
      supabase
        .from('sessions')
        .update({ power_ups: powerUps })
        .eq('id', sessionId),
    ])

    if (statsRes.error)   return { error: statsRes.error.message }
    if (sessionRes.error) return { error: sessionRes.error.message }

    return { success: true, newXp }
  } catch (err) {
    console.error('[purchasePowerUps]', err)
    return { error: 'Something went wrong.' }
  }
}
