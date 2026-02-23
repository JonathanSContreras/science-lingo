'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Send, Loader2, Sparkles } from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

type Message = {
  role: 'user' | 'model'
  content: string
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ChatBot({
  topicTitle,
  topicDescription,
}: {
  topicTitle: string
  topicDescription: string | null
}) {
  const [isOpen, setIsOpen]       = useState(false)
  const [messages, setMessages]   = useState<Message[]>([])
  const [input, setInput]         = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  // Focus input when drawer opens
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 200)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  // ── Send message ───────────────────────────────────────────────────────────

  async function handleSend() {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    const userMsg: Message    = { role: 'user', content: trimmed }
    const optimistic: Message[] = [...messages, userMsg]

    setMessages(optimistic)
    setInput('')
    setIsLoading(true)

    try {
      const res  = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message:          trimmed,
          topicTitle,
          topicDescription,
          history: messages, // history BEFORE new user message
        }),
      })
      const data = await res.json()

      setMessages([
        ...optimistic,
        {
          role:    'model',
          content: data.reply ?? "Sorry, I couldn't process that — try again!",
        },
      ])
    } catch {
      setMessages([
        ...optimistic,
        { role: 'model', content: 'Connection hiccup 😬 Try asking again!' },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* ── Drawer ── */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-[#0d1524] border-t border-slate-700/60 rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out max-w-lg mx-auto ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ maxHeight: '72vh' }}
        aria-hidden={!isOpen}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-slate-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700/50 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center flex-shrink-0">
              <Sparkles size={14} className="text-teal-400" />
            </div>
            <div>
              <p className="text-sm font-black text-white leading-none">AI Tutor</p>
              <p className="text-xs text-slate-500 truncate max-w-48">{topicTitle}</p>
            </div>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors flex-shrink-0"
            aria-label="Close chat"
          >
            <X size={15} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">

          {/* Empty state */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-6">
              <div className="text-4xl mb-3">🧪</div>
              <p className="text-sm font-bold text-slate-300">
                Got a question about {topicTitle}?
              </p>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-56">
                Ask me anything about this topic — I&apos;ll break it down for you!
              </p>

              {/* Starter prompts */}
              <div className="mt-5 flex flex-col gap-2 w-full max-w-xs">
                {[
                  `What's the main idea of ${topicTitle}?`,
                  'Can you give me a real-world example?',
                  'What should I focus on for this topic?',
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => {
                      setInput(prompt)
                      inputRef.current?.focus()
                    }}
                    className="text-xs text-left bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 hover:border-teal-500/40 text-slate-400 hover:text-slate-200 px-3 py-2 rounded-xl transition-all"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message bubbles */}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'model' && (
                <div className="w-6 h-6 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center flex-shrink-0 mb-0.5">
                  <Sparkles size={11} className="text-teal-400" />
                </div>
              )}

              <div
                className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-teal-500 text-slate-900 font-medium rounded-br-md'
                    : 'bg-slate-800 text-slate-200 rounded-bl-md border border-slate-700/50'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex items-end gap-2 justify-start">
              <div className="w-6 h-6 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center flex-shrink-0">
                <Sparkles size={11} className="text-teal-400" />
              </div>
              <div className="bg-slate-800 border border-slate-700/50 px-4 py-3 rounded-2xl rounded-bl-md">
                <div className="flex gap-1.5 items-center">
                  <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div className="px-4 pb-8 pt-3 border-t border-slate-700/40 flex-shrink-0">
          <div className="flex gap-2 items-center">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about this topic…"
              disabled={isLoading}
              className="flex-1 bg-slate-800/80 border border-slate-700/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-teal-500/60 transition-colors disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="w-10 h-10 bg-teal-500 hover:bg-teal-400 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-all active:scale-95 flex-shrink-0"
              aria-label="Send message"
            >
              {isLoading
                ? <Loader2 size={15} className="text-slate-900 animate-spin" />
                : <Send size={15} className="text-slate-900" />
              }
            </button>
          </div>
          <p className="text-xs text-slate-700 text-center mt-2">
            Powered by Gemini AI · Topic-scoped tutor
          </p>
        </div>
      </div>

      {/* ── Floating trigger button ── */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className={`fixed bottom-28 right-4 z-40 flex items-center gap-2 px-3.5 py-2.5 rounded-2xl shadow-lg transition-all active:scale-95 ${
          isOpen
            ? 'bg-teal-500 text-slate-900 shadow-teal-500/30'
            : 'bg-slate-800/90 backdrop-blur-sm border border-teal-500/30 hover:border-teal-500/60 text-teal-400 shadow-black/30 hover:bg-slate-700'
        }`}
        aria-label="Toggle AI tutor"
      >
        <Sparkles size={14} />
        <span className="text-xs font-black">Ask AI</span>
      </button>
    </>
  )
}
