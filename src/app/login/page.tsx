'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { login, signup } from './actions'
import { FlaskConical, Eye, EyeOff, Atom, Zap, ChevronDown } from 'lucide-react'

type Mode = 'login' | 'signup'
type ActionResult = { error?: string; success?: boolean } | undefined

const CLASS_SECTIONS = ['8A', '8B', '8C', '8D', '8E', '8F'] as const

export default function LoginPage() {
  const [mode, setMode]               = useState<Mode>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [isPending, startTransition]  = useTransition()
  const router = useRouter()

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result: ActionResult = await (mode === 'login' ? login(formData) : signup(formData))
      if (result?.error) setError(result.error)
      if (result?.success) router.push('/dashboard')
    })
  }

  return (
    <main className="min-h-screen bg-[#060c18] flex flex-col items-center justify-center p-4 relative overflow-hidden">

      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-teal-500/5 blur-[120px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full bg-violet-500/5 blur-[140px]" />
      </div>

      {/* Floating decorative atoms */}
      <div className="absolute top-12 right-8 text-teal-500/10 animate-pulse">
        <Atom size={64} />
      </div>
      <div className="absolute bottom-16 left-6 text-violet-400/10 animate-pulse" style={{ animationDelay: '1s' }}>
        <Atom size={48} />
      </div>

      {/* Logo */}
      <div className="relative mb-8 text-center">
        <div className="w-20 h-20 mx-auto mb-5 relative">
          <div className="absolute inset-0 bg-teal-400/20 rounded-2xl blur-md" />
          <div className="relative w-full h-full bg-slate-900 border border-teal-500/40 rounded-2xl flex items-center justify-center shadow-lg">
            <FlaskConical className="w-9 h-9 text-teal-400" />
          </div>
        </div>
        <h1 className="text-4xl font-black text-white tracking-tight">
          Science<span className="text-teal-400">Lingo</span>
        </h1>
        <p className="text-slate-400 mt-2 text-sm font-medium">
          {mode === 'login' ? 'Welcome back, scientist 👋' : "Ready to level up? Let's go 🚀"}
        </p>
      </div>

      {/* Card */}
      <div className="relative w-full max-w-sm">
        <div className="absolute inset-0 bg-gradient-to-b from-teal-500/10 to-transparent rounded-3xl blur-sm" />
        <div className="relative bg-slate-900/80 backdrop-blur-sm border border-slate-700/60 rounded-3xl p-6 shadow-2xl">

          {/* Mode toggle */}
          <div className="flex bg-slate-800/80 rounded-2xl p-1 mb-6 gap-1">
            {(['login', 'signup'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-200 ${
                  mode === m
                    ? 'bg-teal-500 text-slate-900 shadow-md shadow-teal-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m === 'login' ? 'Log In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} suppressHydrationWarning className="space-y-4">

            {mode === 'signup' && (
              <Field label="Your Name" name="name" type="text" placeholder="Ada Lovelace" required />
            )}

            {/* Student ID field — different name per mode so server actions read the right key */}
            {mode === 'login' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Student ID
                </label>
                <input
                  name="identifier"
                  type="text"
                  placeholder="e.g. 123456"
                  required
                  inputMode="numeric"
                  className="w-full bg-slate-800/80 border border-slate-700/60 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500/60 focus:bg-slate-800 transition-all duration-150"
                />
                <p className="text-xs text-slate-600 mt-1.5">Teachers: enter your email address instead</p>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Student ID
                </label>
                <input
                  name="studentId"
                  type="text"
                  placeholder="e.g. 123456"
                  required
                  inputMode="numeric"
                  className="w-full bg-slate-800/80 border border-slate-700/60 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500/60 focus:bg-slate-800 transition-all duration-150"
                />
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Class Section
                </label>
                <div className="relative">
                  <select
                    name="class_section"
                    required
                    defaultValue=""
                    className="w-full bg-slate-800/80 border border-slate-700/60 rounded-xl px-4 py-3 pr-10 text-white text-sm focus:outline-none focus:border-teal-500/60 focus:bg-slate-800 transition-all duration-150 appearance-none"
                  >
                    <option value="" disabled>Select your class…</option>
                    {CLASS_SECTIONS.map((s) => (
                      <option key={s} value={s}>Class {s}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
              </div>
            )}

            <PasswordField
              showPassword={showPassword}
              onToggle={() => setShowPassword((v) => !v)}
            />

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3">
                <span className="text-red-400 mt-0.5 text-xs">⚠</span>
                <p className="text-sm text-red-400 leading-snug">{friendlyError(error)}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full mt-2 bg-teal-500 hover:bg-teal-400 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 font-black text-base py-3.5 rounded-2xl transition-all duration-150 shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                  {mode === 'login' ? 'Signing in…' : 'Creating account…'}
                </span>
              ) : (
                <>
                  <Zap size={16} className="fill-slate-900" />
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      <p className="mt-8 text-slate-600 text-xs text-center">
        Science Lingo · Built for curious minds
      </p>
    </main>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Field({
  label,
  name,
  type,
  placeholder,
  required,
}: {
  label: string
  name: string
  type: string
  placeholder: string
  required?: boolean
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
        {label}
      </label>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="w-full bg-slate-800/80 border border-slate-700/60 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500/60 focus:bg-slate-800 transition-all duration-150"
      />
    </div>
  )
}

function PasswordField({
  showPassword,
  onToggle,
}: {
  showPassword: boolean
  onToggle: () => void
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
        Password
      </label>
      <div className="relative">
        <input
          name="password"
          type={showPassword ? 'text' : 'password'}
          placeholder="••••••••"
          required
          minLength={6}
          className="w-full bg-slate-800/80 border border-slate-700/60 rounded-xl px-4 py-3 pr-11 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-teal-500/60 focus:bg-slate-800 transition-all duration-150"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  )
}

// Make Supabase errors more student-friendly
function friendlyError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'Student ID or password is incorrect. Try again!'
  if (msg.includes('User already registered')) return 'That student ID is already taken. Try logging in instead.'
  if (msg.includes('Password should be')) return 'Password must be at least 6 characters.'
  return msg
}
