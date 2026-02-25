# 🧪 Science Lingo — Full Product Plan

> Duolingo-inspired science review platform for 8th grade students.
> Built for engagement, retention, and real learning outcomes.

---

## 🎯 Vision

Science Lingo is a weekly science review platform where students log in, complete topic-based sessions, earn XP and badges, compete on a leaderboard, and get help from an AI chatbot — all in one engaging, gamified experience. Every week, a new topic is loaded. The game stays the same. The learning never stops.

---

## Current Status

### ✅ Completed
- [x] Schema created and running in Supabase
- [x] Next.js app scaffolded
- [x] Supabase client setup (`src/lib/supabase/client.ts`, `server.ts`, `admin.ts`)
- [x] Auth middleware (`src/proxy.ts`) — redirects unauthenticated users, role-based routing
- [x] `/login` — Student ID login (no email, no verification); teachers use email. Admin API creates users with `email_confirm: true` (zero emails ever sent). Class section chosen on signup.
- [x] `/dashboard` — XP bar, streak, current active topic card, mini leaderboard preview, quick session link
- [x] `/session/[topicId]` — full quiz flow: one question at a time, hint toggle, instant feedback with explanation, progress bar, refresh-safe (reuses incomplete session); competition mode has 25s per-question countdown timer (auto-submits wrong on expiry)
- [x] `/session/summary` — post-session card: accuracy, XP earned + breakdown, streak, class rank, highlight badge message
- [x] `/leaderboard` — visual podium (top 3) + full ranked list; students see only their class section; teachers see section tabs (All Classes + 8A–8F); weekly view ranked by accuracy DESC + completion time ASC as tiebreaker
- [x] `/profile` — XP progress bar to next level, 4-stat grid, badge showcase (7 possible, earned/locked states), recent sessions list, sign out
- [x] `/teacher` — section tabs (All Classes + 8A–8F) filter the student roster; summary stats update per filter; class section shown per student in All Classes view
- [x] `/teacher/topics` — list all topics, set active topic, create new topic
- [x] `/teacher/topics/[topicId]` — view/add/delete questions; pool size indicator (need 10+ to go live); competition cap setting; bulk CSV/TSV import (paste from Google Sheets)
- [x] Accuracy scoring system — `(correctAnswers / totalAttempts) × 100`, per-session + aggregated overall
- [x] XP & leveling system — base 100 + accuracy bonuses (+50/+100/+150) + streak bonus (+25)
- [x] Streak tracking — weekly streak, upserted on session complete
- [x] Badge system — auto-awarded: `first_session`, `perfectionist`, `on_fire`, `veteran`, `science_brain`
- [x] AI Chatbot (Gemini Flash) — floating drawer on session page, topic-scoped, history-aware, 2–4 sentence responses
- [x] AI Mini Lesson — Gemini-generated lesson shown before quiz starts; hook + 3–4 concept cards + quiz tip; graceful error fallback (`/api/lesson`, `MiniLesson.tsx`, phase state in `QuizClient.tsx`)
- [x] Landing page (`/`) — hero, features grid, how it works, level ladder, AI tutor callout, final CTA
- [x] `leaderboard` Supabase view — columns: `student_id, name, avatar, class_section, overall_accuracy, xp, streak_weeks, rank`
- [x] `profiles` table — `class_section` (8A–8F, null for teachers) and `student_number` (unique, null for teachers) columns
- [x] Question pool system — topics can hold 30–50+ questions; practice picks 10 random per session; competition uses all (or up to an optional cap); saved `question_ids` on session row keeps same set on refresh
- [x] Competition timer — 25s countdown per question in competition mode; color shifts teal → amber → red; auto-submits a wrong answer on expiry
- [x] Bulk question import — teacher pastes from Google Sheets or CSV; auto-detects tab vs comma; per-row parse preview with error highlighting; only valid rows submitted
- [x] Weekly leaderboard rankings for students; week picker for teachers

### 🔲 Not Yet Built
- [ ] `top_of_the_class` and `most_improved` badge triggers (require weekly snapshot logic)
- [ ] Teacher dashboard analytics (trends, who's struggling)
- [ ] Manual badge awards by teacher
- [ ] Real-time leaderboard updates during active sessions

### 🔑 Key Implementation Notes
- **Student auth:** login identifier is student ID → converted to `{studentId}@scilingoapp.internal` server-side. Teachers use real email (detected by presence of `@`).
- **No email confirmations:** `admin.auth.admin.createUser({ email_confirm: true })` — zero emails ever sent. Requires `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` (server-side only, never exposed to client).
- **Teacher accounts:** must be created manually in Supabase Auth dashboard + insert a profile row with `role = 'teacher'`. No teacher signup flow exists in the app.
- **Section filtering:** server-side via `?section=8A` searchParams — no client state needed. Both `/leaderboard` and `/teacher` support this pattern.
- **next.config.mjs:** `output: 'export'` was removed — it's incompatible with API routes, middleware, and Supabase auth cookies. Deploy to Vercel/Netlify (not GitHub Pages).
- **Question pool:** `sessions.question_ids uuid[]` stores the shuffled question IDs at session creation time. Resume restores the exact same order. Practice always picks 10 random; competition picks all (or up to `topics.competition_limit` if set).
- **Leaderboard tiebreaker:** Weekly rankings sort by `accuracy_score DESC` then `completion_seconds ASC` (derived from `completed_at - started_at`). No schema change needed — uses existing session timestamps.
- **Competition timer:** 25s per question, client-side only (`QuizClient.tsx`). On expiry, auto-records a wrong answer for an unchosen option and advances or ends the session.
- **Bulk import:** `BulkImportForm.tsx` parses tab-separated (Google Sheets) or comma-separated input. Columns: Question, Option A, B, C, D, Correct (a/b/c/d), Explanation, Hint. Only valid rows sent to `bulkAddQuestions` server action.

--

## 🏗️ Core MVP Features (Build First)

### 1. Authentication & Profiles
- Student login (email/password via Supabase Auth)
- Teacher login with elevated permissions
- Student profile page showing:
  - Display name and avatar (choose from science-themed icons)
  - Current level and XP
  - Overall accuracy score
  - Current streak
  - Badges earned

---

### 2. Weekly Topic Sessions

Each week you load a new question set tagged to a topic (e.g. "Plate Tectonics 7.10ab"). The platform structure never changes — only the content does.

**Session Flow:**
1. Student sees the current week's topic with a short 2–3 sentence intro (conversational, not textbook)
2. Questions appear one at a time
3. Student selects an answer
4. Immediate feedback appears:
   - ✅ Correct: brief explanation of *why* it's right
   - ❌ Wrong: clear explanation of *why* it's wrong, with the correct answer shown
5. After all questions, a **Session Summary Card** is generated

**Question Types (start with one, expand later):**
- Multiple choice (MVP)
- > *Future: True/False, Fill in the blank, Drag and drop matching*

**Session Length:** 10 questions per session (completable in ~5–7 minutes)

---

### 3. Accuracy Scoring System

The core metric that makes Science Lingo fair and honest.

```
Accuracy Score = (Correct Answers / Total Attempts) × 100
```

- A student who gets 8/8 right scores higher than one who attempted 12 times to get 8 right
- Rewards genuine knowledge, not trial-and-error guessing
- Tracked per topic session and aggregated into an **Overall Accuracy Score**
- Displayed on profile and leaderboard

---

### 4. XP & Leveling System

Students earn XP for every session they complete. XP fuels their scientist rank.

| Level | Rank Title       | XP Required |
|-------|-----------------|-------------|
| 1     | Lab Intern       | 0           |
| 2     | Field Researcher | 500         |
| 3     | Scientist        | 1,200       |
| 4     | Senior Scientist | 2,500       |
| 5     | Lead Researcher  | 4,500       |
| 6     | Professor        | 7,500       |

**XP Breakdown per Session:**
- Base XP: 100 per completed session
- Accuracy Bonus: +50 XP for 80%+, +100 XP for 95%+
- Streak Bonus: +25 XP per active streak week
- Perfect Score Bonus: +150 XP for 100% accuracy

---

### 5. Streak Tracking

- Completing at least one session per week maintains the streak
- Streak counter shown on dashboard and mid-session
- Mid-session notification: *"You're on a 5-question streak 🔥"*
- Missing a week breaks the streak — creates urgency to come back

---

### 6. Leaderboard

Live class leaderboard visible to all students.

**Columns:**
| Rank | Name | Accuracy Score | Weekly XP | Streak |
|------|------|---------------|-----------|--------|

- Updates in real time during active sessions
- Resets weekly rankings (but overall accuracy persists)
- **"Most Improved" highlight** — student with the biggest accuracy gain that week
- Teacher can view a private expanded version with attempt counts and time spent

---

### 7. Badges

Rare, specific, meaningful. Scarcity makes them valuable.

| Badge | Trigger |
|-------|---------|
| 🔬 First Session | Complete your first session |
| ⚡ Perfectionist | Score 100% accuracy on a session |
| 🔥 On Fire | Maintain a 3-week streak |
| 🏆 Top of the Class | #1 on weekly leaderboard |
| 📈 Most Improved | Biggest accuracy gain in a week |
| 🧠 Science Brain | Score 90%+ for 3 sessions in a row |
| 💎 Veteran | Complete 10 total sessions |

---

### 8. AI Chatbot (Gemini Flash)

A topic-scoped AI tutor available during every session.

- Lives in a side panel or floating button on the session screen
- Constrained to the current week's topic — it's a tutor, not a search engine
- Students can ask questions like "wait why do tectonic plates move?" and get a clear, conversational answer
- Available 24/7 — removes the "stuck at 10pm with no help" problem
- > *Future: Log common chatbot questions so teacher can see what students struggle with most*

---

### 9. Session Summary Card

Auto-generated at the end of every session. Visual, clean, and screenshot-worthy.

**Card includes:**
- Topic name
- Accuracy score for that session
- XP earned
- Current streak
- Weekly rank
- A highlight stat (e.g. "Perfect Score!" or "Most Improved This Week")

---

### 10. Teacher Dashboard

Your control center.

- **View all students:** accuracy per topic, total attempts, streak status, XP
- **Load new question sets:** upload or enter questions + answer + explanation per question, tagged to a topic
- **See trends:** who is struggling, who is excelling, accuracy over time
- **Manual badge awards:** reward students for participation or effort you observe in person
- **Chatbot insights:** *(Future)* see what questions students asked the AI most

---

## 🗄️ Database Schema (Supabase)

### Tables

**`users`**
```
id, email, name, role (student/teacher), avatar, created_at
```

**`student_profiles`**
```
id, user_id, xp, level, streak, overall_accuracy, last_session_date
```

**`topics`**
```
id, title, description, week_number, created_by, active (bool), created_at, competition_limit (integer, nullable)
```

**`questions`**
```
id, topic_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, hint (text, nullable), order_index (integer)
```

**`sessions`**
```
id, student_id, topic_id, started_at, completed_at, accuracy_score, xp_earned, total_attempts, correct_answers, session_type ('practice'|'competition'), question_ids (uuid[], nullable)
```

**`answers`**
```
id, session_id, question_id, selected_option, is_correct, attempt_number
```

**`badges`**
```
id, student_id, badge_type, earned_at
```

---

## 🛠️ Tech Stack

| Layer | Tool |
|-------|------|
| Frontend | Next.js + TypeScript |
| Styling | Tailwind CSS |
| Auth + Database | Supabase |
| AI Chatbot | Gemini Flash API |
| Hosting | Vercel or Netlify |
| Icons/UI | Lucide Icons + shadcn/ui |

---

## 📱 Screens / Pages

| Screen | Purpose |
|--------|---------|
| `/login` | Student and teacher login |
| `/dashboard` | Student home — XP, streak, current topic, leaderboard |
| `/session/[topic-id]` | Active quiz session with chatbot |
| `/session/summary` | Post-session summary card |
| `/profile` | Student profile — badges, history, accuracy chart |
| `/leaderboard` | Full class leaderboard |
| `/teacher` | Teacher dashboard — student overview |
| `/teacher/topics` | Manage and load weekly question sets |

---

## 🚀 Build Order (Recommended)

1. ✅ Auth (login/signup, roles)
2. ✅ Database schema setup in Supabase
3. ✅ Teacher question loader
4. ✅ Student session flow (questions + feedback)
5. ✅ Accuracy scoring logic
6. ✅ XP and level system
7. ✅ Streak tracking
8. ✅ Leaderboard
9. ✅ Session summary card
10. ✅ Gemini Flash chatbot integration
11. ✅ Badges (auto-awarded; manual award is future)
12. ✅ Competition timer (25s per question, auto-submit on expiry)
13. ✅ Question pool + random selection (practice: 10 random; competition: all or capped)
14. ✅ Bulk question import (Google Sheets / CSV paste)
15. ✅ Leaderboard tiebreaker (accuracy + completion time)
16. [ ] Teacher dashboard analytics

---

## 🔮 Future Features (v2+)

- **Hint system** — spend earned coins for a hint on a hard question
- **Boss rounds** — 5-question hard challenge unlocked at the end of each topic, higher XP reward
- **Review mode** — students revisit all missed questions from past sessions
- **True/False and fill-in-the-blank question types**
- **Drag-and-drop matching questions** (great for vocab)
- **Parent/guardian read-only progress link**
- **Multi-teacher support** — each teacher has their own class with isolated leaderboards
- **Chatbot analytics** — teacher sees most-asked questions to identify class weak spots
- **Push/email notifications** — weekly reminder to complete the session and maintain streak
- **Custom avatar builder** — science-themed character customization
- **Class challenges** — teacher sets a class-wide accuracy goal, everyone wins a reward if hit
- **Shareable profile cards** — exportable summary of a student's best stats
- **Offline mode** — complete sessions without internet, sync when back online
- **Voice questions** — read questions aloud for accessibility

---

## 📌 Notes

- **Start lean.** Get auth, sessions, scoring, and leaderboard live first. Let real students react before adding complexity.
- **Mobile-first design.** 8th graders will open this on their phones. Every screen needs to feel native on mobile.
- **Tone matters.** Feedback text should feel like a cool teacher talking, not a textbook. Write every explanation conversationally.
- **You are the hype.** Reference the leaderboard in class. Call out streaks. The app is the tool — your energy drives the engagement.

---

*Built for Jonathan's 8th grade science tutoring sessions. Powered by curiosity.*