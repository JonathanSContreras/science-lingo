import Link from 'next/link'
import {
  FlaskConical, Zap, Flame, Trophy, Star,
  Brain, Target, ChevronRight, Atom, Sparkles,
} from 'lucide-react'

// ─── Feature data ────────────────────────────────────────────────────────────

const features = [
  {
    icon: <Trophy size={22} className="text-amber-400" />,
    bg:   'bg-amber-500/10 border-amber-500/25',
    title: 'Class Leaderboard',
    desc:  'See where you rank against your classmates — updated after every session.',
  },
  {
    icon: <Zap size={22} className="text-teal-400" />,
    bg:   'bg-teal-500/10 border-teal-500/25',
    title: 'XP & Levels',
    desc:  'Earn XP for every session. Level up from Lab Intern all the way to Professor.',
  },
  {
    icon: <Flame size={22} className="text-orange-400" />,
    bg:   'bg-orange-500/10 border-orange-500/25',
    title: 'Streak System',
    desc:  'Complete a session every week to keep your streak alive. Miss one and start over.',
  },
  {
    icon: <Sparkles size={22} className="text-violet-400" />,
    bg:   'bg-violet-500/10 border-violet-500/25',
    title: 'AI Science Tutor',
    desc:  'Stuck on a concept? Ask the built-in AI tutor — scoped to only your current topic.',
  },
  {
    icon: <Star size={22} className="text-pink-400" />,
    bg:   'bg-pink-500/10 border-pink-500/25',
    title: 'Rare Badges',
    desc:  'Earn badges for perfect scores, streaks, and becoming the top scientist in class.',
  },
  {
    icon: <Target size={22} className="text-cyan-400" />,
    bg:   'bg-cyan-500/10 border-cyan-500/25',
    title: 'Accuracy Score',
    desc:  'Ranked by what you actually know — not how many times you guessed.',
  },
]

const steps = [
  { emoji: '📖', step: '1', title: 'See the topic', desc: "Your teacher posts this week's topic — plate tectonics, cells, atoms, whatever's next." },
  { emoji: '🎯', step: '2', title: 'Answer 10 questions', desc: 'Pick the right answer, see instant feedback, and get a clear explanation every time.' },
  { emoji: '🏆', step: '3', title: 'Climb the board', desc: 'Earn XP, build your streak, and see exactly where you rank in the class.' },
]

const levels = [
  { level: 1, title: 'Lab Intern',       xp: '0 XP',    color: 'text-slate-400' },
  { level: 2, title: 'Field Researcher', xp: '500 XP',  color: 'text-teal-400' },
  { level: 3, title: 'Scientist',        xp: '1,200 XP', color: 'text-cyan-400' },
  { level: 4, title: 'Senior Scientist', xp: '2,500 XP', color: 'text-violet-400' },
  { level: 5, title: 'Lead Researcher',  xp: '4,500 XP', color: 'text-amber-400' },
  { level: 6, title: 'Professor',        xp: '7,500 XP', color: 'text-pink-400' },
]

// ─── Page ────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#060c18] text-white overflow-x-hidden">

      {/* ── Blobs ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute top-[-15%] left-[-15%] w-[600px] h-[600px] rounded-full bg-teal-500/5 blur-[140px]" />
        <div className="absolute top-[30%] right-[-15%] w-[500px] h-[500px] rounded-full bg-violet-500/5 blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[400px] h-[400px] rounded-full bg-cyan-500/4 blur-[120px]" />
      </div>

      {/* ── Nav ── */}
      <nav className="relative z-10 flex items-center justify-between px-5 py-5 max-w-2xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-slate-900 border border-teal-500/40 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/10">
            <FlaskConical size={18} className="text-teal-400" />
          </div>
          <span className="text-lg font-black">
            Science<span className="text-teal-400">Lingo</span>
          </span>
        </div>
        <Link
          href="/login"
          className="text-sm font-bold text-slate-400 hover:text-white transition-colors"
        >
          Log In →
        </Link>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 px-5 pt-14 pb-20 max-w-2xl mx-auto text-center">

        {/* Floating atoms — decorative */}
        <div className="absolute top-6 left-4 text-teal-500/15 animate-pulse">
          <Atom size={56} />
        </div>
        <div className="absolute top-20 right-2 text-violet-400/10 animate-pulse" style={{ animationDelay: '1.2s' }}>
          <Atom size={40} />
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/25 text-teal-300 text-xs font-bold px-4 py-2 rounded-full mb-8">
          <Zap size={12} className="fill-teal-400" />
          Built for 8th grade science
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl font-black leading-[1.1] tracking-tight mb-5">
          Science is hard.{' '}
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-violet-400">
            Learning it shouldn't be.
          </span>
        </h1>

        <p className="text-lg text-slate-400 leading-relaxed max-w-md mx-auto mb-10">
          Weekly science reviews that feel like a game — earn XP, build streaks,
          compete on the leaderboard, and get help from an AI tutor. All in 10 questions.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/login"
            className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 active:scale-[0.98] text-slate-900 font-black text-base px-8 py-4 rounded-2xl transition-all shadow-xl shadow-teal-500/25 w-full sm:w-auto justify-center"
          >
            <Zap size={18} className="fill-slate-900" />
            Start Playing
            <ChevronRight size={16} />
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700/60 hover:border-slate-600 text-slate-300 font-bold text-base px-8 py-4 rounded-2xl transition-all w-full sm:w-auto justify-center"
          >
            I already have an account
          </Link>
        </div>

        {/* Social proof mini stats */}
        <div className="flex items-center justify-center gap-8 mt-12 pt-8 border-t border-slate-800/60">
          {[
            { value: '10',   label: 'questions per session' },
            { value: '6',    label: 'scientist levels' },
            { value: '7',    label: 'badges to earn' },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-2xl font-black text-white">{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative z-10 px-5 py-16 max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-xs text-teal-400 font-black uppercase tracking-widest mb-3">Why it works</p>
          <h2 className="text-2xl font-black">Everything that makes you keep coming back</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {features.map(({ icon, bg, title, desc }) => (
            <div
              key={title}
              className={`${bg} border rounded-2xl p-5 hover:scale-[1.01] transition-transform`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex-shrink-0">{icon}</div>
                <div>
                  <p className="text-sm font-black text-white mb-1">{title}</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="relative z-10 px-5 py-16 max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-xs text-violet-400 font-black uppercase tracking-widest mb-3">Simple by design</p>
          <h2 className="text-2xl font-black">How it works</h2>
        </div>

        <div className="space-y-4">
          {steps.map(({ emoji, step, title, desc }) => (
            <div
              key={step}
              className="flex items-start gap-4 bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5"
            >
              <div className="w-10 h-10 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center flex-shrink-0 text-xl">
                {emoji}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-black text-slate-600 uppercase">Step {step}</span>
                </div>
                <p className="text-sm font-black text-white mb-1">{title}</p>
                <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Level ladder ── */}
      <section className="relative z-10 px-5 py-16 max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-xs text-amber-400 font-black uppercase tracking-widest mb-3">XP & Ranking</p>
          <h2 className="text-2xl font-black">Your scientist journey</h2>
          <p className="text-sm text-slate-500 mt-2">
            Every session earns XP. Every week you grind, the title gets better.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-700/50 rounded-3xl overflow-hidden">
          {levels.map(({ level, title, xp, color }, i) => (
            <div
              key={level}
              className={`flex items-center gap-4 px-5 py-4 ${
                i < levels.length - 1 ? 'border-b border-slate-800/60' : ''
              } ${i === 0 ? 'bg-teal-500/5' : ''}`}
            >
              <div className="w-8 h-8 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center text-xs font-black text-slate-500 flex-shrink-0">
                {level}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-black ${color}`}>{title}</p>
              </div>
              <p className="text-xs text-slate-500 font-mono tabular-nums">{xp}</p>
              {i === 0 && (
                <span className="text-xs bg-teal-500/20 text-teal-400 border border-teal-500/30 px-2 py-0.5 rounded-full font-bold">
                  Start here
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── AI Tutor callout ── */}
      <section className="relative z-10 px-5 py-10 max-w-2xl mx-auto">
        <div className="relative bg-gradient-to-br from-violet-900/40 to-slate-900/60 border border-violet-500/25 rounded-3xl p-7 overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-violet-500/8 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-start gap-4 mb-5">
            <div className="w-12 h-12 bg-violet-500/20 border border-violet-500/40 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Brain size={22} className="text-violet-400" />
            </div>
            <div>
              <p className="text-xs font-black text-violet-400 uppercase tracking-widest mb-1">Built-in AI Tutor</p>
              <h2 className="text-xl font-black leading-tight">Stuck at 10pm with no one to ask?</h2>
            </div>
          </div>

          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            Every session comes with a topic-scoped AI tutor. Ask it anything about the current
            topic — it gives short, clear answers. Like a patient teacher available 24/7.
          </p>

          {/* Fake chat preview */}
          <div className="space-y-2.5">
            <div className="flex justify-end">
              <div className="bg-teal-500 text-slate-900 text-xs font-medium px-3.5 py-2 rounded-2xl rounded-br-md max-w-[75%]">
                wait why do tectonic plates actually move?
              </div>
            </div>
            <div className="flex items-end gap-2">
              <div className="w-6 h-6 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
                <Sparkles size={11} className="text-violet-400" />
              </div>
              <div className="bg-slate-800 border border-slate-700/50 text-slate-200 text-xs px-3.5 py-2.5 rounded-2xl rounded-bl-md max-w-[75%] leading-relaxed">
                Great question! Think of the mantle as a super-slow conveyor belt. Heat from Earth&apos;s core creates currents that drag the plates along. It&apos;s only a few centimeters a year — about as fast as your fingernail grows!
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative z-10 px-5 py-20 max-w-2xl mx-auto text-center">
        <div className="text-5xl mb-6 animate-bounce">🔬</div>
        <h2 className="text-3xl font-black mb-4">
          Ready to become a{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">
            science legend?
          </span>
        </h2>
        <p className="text-slate-400 text-base mb-8 max-w-sm mx-auto">
          10 questions. Real XP. A leaderboard with your name on it. Let&apos;s go.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 bg-teal-500 hover:bg-teal-400 active:scale-[0.98] text-slate-900 font-black text-lg px-10 py-4 rounded-2xl transition-all shadow-xl shadow-teal-500/25"
        >
          <Zap size={20} className="fill-slate-900" />
          Let&apos;s go
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-slate-800/60 px-5 py-8 max-w-2xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FlaskConical size={16} className="text-teal-400" />
            <span className="text-sm font-black">
              Science<span className="text-teal-400">Lingo</span>
            </span>
          </div>
          <p className="text-xs text-slate-600 text-center">
            Built for 8th grade science. Powered by curiosity.
          </p>
          <Link
            href="/login"
            className="text-xs text-slate-500 hover:text-teal-400 transition-colors font-medium"
          >
            Log In →
          </Link>
        </div>
      </footer>

    </main>
  )
}
