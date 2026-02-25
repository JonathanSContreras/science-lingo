'use client'

import { useState, useTransition } from 'react'
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Upload } from 'lucide-react'
import { bulkAddQuestions } from '../actions'

// ─── Types ────────────────────────────────────────────────────────────────────

type ParsedRow = {
  question_text:  string
  option_a:       string
  option_b:       string
  option_c:       string
  option_d:       string
  correct_option: string
  explanation:    string
  hint:           string
  errors:         string[]
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

// Splits a single line — uses tabs if present (Google Sheets), otherwise CSV
function splitLine(line: string): string[] {
  if (line.includes('\t')) return line.split('\t').map((c) => c.trim())

  // Simple CSV parser with quote handling
  const cells: string[] = []
  let cur = ''
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++ }
      else inQuote = !inQuote
    } else if (ch === ',' && !inQuote) {
      cells.push(cur.trim()); cur = ''
    } else {
      cur += ch
    }
  }
  cells.push(cur.trim())
  return cells
}

function parseLine(line: string): ParsedRow {
  const cells = splitLine(line)
  const [
    question_text  = '',
    option_a       = '',
    option_b       = '',
    option_c       = '',
    option_d       = '',
    correct_raw    = '',
    explanation    = '',
    hint           = '',
  ] = cells

  const correct_option = correct_raw.trim().toLowerCase()
  const errors: string[] = []

  if (!question_text.trim())  errors.push('Question is empty')
  if (!option_a.trim())       errors.push('Option A is empty')
  if (!option_b.trim())       errors.push('Option B is empty')
  if (!option_c.trim())       errors.push('Option C is empty')
  if (!option_d.trim())       errors.push('Option D is empty')
  if (!['a', 'b', 'c', 'd'].includes(correct_option))
    errors.push(`Correct must be a/b/c/d (got "${correct_raw.trim() || 'blank'}")`)
  if (!explanation.trim())    errors.push('Explanation is empty')

  return {
    question_text:  question_text.trim(),
    option_a:       option_a.trim(),
    option_b:       option_b.trim(),
    option_c:       option_c.trim(),
    option_d:       option_d.trim(),
    correct_option,
    explanation:    explanation.trim(),
    hint:           hint.trim(),
    errors,
  }
}

function parseText(raw: string): ParsedRow[] {
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map(parseLine)
}

// ─── Component ────────────────────────────────────────────────────────────────

const TEMPLATE_HEADER =
  'Question\tOption A\tOption B\tOption C\tOption D\tCorrect (a/b/c/d)\tExplanation\tHint (optional)'

const TEMPLATE_EXAMPLE =
  'Which layer of Earth is made of solid iron?\tCrust\tMantle\tOuter core\tInner core\td\tThe inner core is under extreme pressure which keeps it solid despite very high temperatures.\tThink about pressure and temperature.'

export function BulkImportForm({
  topicId,
  startOrderIndex,
}: {
  topicId:         string
  startOrderIndex: number
}) {
  const [open, setOpen]           = useState(false)
  const [text, setText]           = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [addedCount, setAddedCount] = useState(0)
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const rows   = text.trim() ? parseText(text) : []
  const valid  = rows.filter((r) => r.errors.length === 0)
  const errored = rows.filter((r) => r.errors.length > 0)

  function handleImport() {
    if (valid.length === 0) return
    setServerError(null)
    startTransition(async () => {
      const res = await bulkAddQuestions(topicId, valid, startOrderIndex)
      if ('error' in res) {
        setServerError(res.error)
      } else {
        setAddedCount(valid.length)
        setSubmitted(true)
        setText('')
      }
    })
  }

  function handleReset() {
    setSubmitted(false)
    setAddedCount(0)
    setText('')
    setServerError(null)
  }

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-3xl overflow-hidden">

      {/* Toggle header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-800/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Upload size={14} className="text-violet-400" />
          <span className="text-xs font-black uppercase tracking-wider text-violet-400">
            Bulk Import
          </span>
        </div>
        {open ? (
          <ChevronUp size={14} className="text-slate-500" />
        ) : (
          <ChevronDown size={14} className="text-slate-500" />
        )}
      </button>

      {/* Body */}
      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-slate-800">

          {submitted ? (
            // ── Success state ──
            <div className="pt-4 text-center space-y-3">
              <div className="text-4xl">🎉</div>
              <p className="font-bold text-white">
                {addedCount} question{addedCount !== 1 ? 's' : ''} added!
              </p>
              <button
                onClick={handleReset}
                className="text-xs text-violet-400 hover:text-violet-300 transition-colors underline underline-offset-2"
              >
                Import more questions
              </button>
            </div>
          ) : (
            <>
              {/* Instructions */}
              <div className="pt-4 space-y-2">
                <p className="text-xs font-bold text-slate-400">
                  Paste from Google Sheets or any CSV. One question per row, columns in this order:
                </p>
                <div className="bg-slate-800/60 rounded-xl px-3 py-2.5 overflow-x-auto">
                  <code className="text-xs text-slate-300 whitespace-nowrap">
                    Question · Option A · Option B · Option C · Option D · Correct (a/b/c/d) · Explanation · Hint
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => setText(TEMPLATE_EXAMPLE)}
                  className="text-xs text-violet-400/70 hover:text-violet-400 transition-colors"
                >
                  Load example row →
                </button>
              </div>

              {/* Textarea */}
              <textarea
                value={text}
                onChange={(e) => { setText(e.target.value); setServerError(null) }}
                rows={6}
                placeholder={`Paste rows here…\n\nExample:\n${TEMPLATE_EXAMPLE}`}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-700 focus:outline-none focus:border-violet-500/60 transition-colors font-mono leading-relaxed resize-y"
              />

              {/* Parse preview */}
              {rows.length > 0 && (
                <div className="space-y-3">

                  {/* Summary */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {valid.length > 0 && (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                        <CheckCircle2 size={13} />
                        {valid.length} ready to import
                      </span>
                    )}
                    {errored.length > 0 && (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-red-400">
                        <AlertCircle size={13} />
                        {errored.length} row{errored.length !== 1 ? 's' : ''} with errors (will be skipped)
                      </span>
                    )}
                  </div>

                  {/* Preview rows */}
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {rows.map((row, i) => (
                      <div
                        key={i}
                        className={`rounded-xl px-3 py-2.5 border text-xs ${
                          row.errors.length > 0
                            ? 'bg-red-500/8 border-red-500/20'
                            : 'bg-slate-800/60 border-slate-700/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className={`font-bold leading-snug flex-1 ${
                            row.errors.length > 0 ? 'text-red-300' : 'text-white'
                          }`}>
                            {i + 1}. {row.question_text || <span className="italic text-slate-600">empty</span>}
                          </span>
                          {row.errors.length === 0 ? (
                            <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle size={13} className="text-red-400 flex-shrink-0 mt-0.5" />
                          )}
                        </div>

                        {row.errors.length === 0 ? (
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-slate-500 mt-1">
                            {(['a', 'b', 'c', 'd'] as const).map((opt) => (
                              <span
                                key={opt}
                                className={
                                  row.correct_option === opt
                                    ? 'text-emerald-400 font-bold'
                                    : ''
                                }
                              >
                                {opt.toUpperCase()}: {row[`option_${opt}` as keyof ParsedRow] as string}
                              </span>
                            ))}
                            {row.hint && (
                              <span className="text-amber-500/70">
                                💡 {row.hint}
                              </span>
                            )}
                          </div>
                        ) : (
                          <ul className="mt-1 space-y-0.5">
                            {row.errors.map((err, j) => (
                              <li key={j} className="text-red-400/80">
                                · {err}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Server error */}
                  {serverError && (
                    <p className="text-xs text-red-400 flex items-center gap-1.5">
                      <AlertCircle size={12} /> {serverError}
                    </p>
                  )}

                  {/* Import button */}
                  {valid.length > 0 && (
                    <button
                      onClick={handleImport}
                      disabled={isPending}
                      className="w-full py-3 rounded-2xl bg-violet-500 hover:bg-violet-400 active:scale-[0.98] disabled:opacity-50 text-white font-black text-sm transition-all shadow-lg shadow-violet-500/20"
                    >
                      {isPending ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Importing…
                        </span>
                      ) : (
                        `Add ${valid.length} Question${valid.length !== 1 ? 's' : ''} →`
                      )}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
