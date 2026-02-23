import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'

type HistoryMessage = {
  role: 'user' | 'model'
  content: string
}

export async function POST(req: Request) {
  try {
    // ── Auth gate ──
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // ── Parse body ──
    const { message, topicTitle, topicDescription, history } = await req.json() as {
      message: string
      topicTitle: string
      topicDescription: string | null
      history: HistoryMessage[]
    }

    if (!message?.trim() || !topicTitle) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // ── API key ──
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error('[chat] GEMINI_API_KEY not set')
      return Response.json({ error: 'AI service not configured' }, { status: 503 })
    }

    // ── Gemini setup ──
    const genAI  = new GoogleGenerativeAI(apiKey)
    const model  = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: buildSystemPrompt(topicTitle, topicDescription),
    })

    // ── Convert history to Gemini format ──
    const geminiHistory = (history ?? []).map((msg) => ({
      role:  msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }))

    // ── Send message ──
    const chat   = model.startChat({
      history: geminiHistory,
      generationConfig: {
        maxOutputTokens: 300,
        temperature: 0.75,
      },
    })

    const result = await chat.sendMessage(message.trim())
    const reply  = result.response.text()

    return Response.json({ reply })
  } catch (err) {
    console.error('[chat/route]', err)
    return Response.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(topicTitle: string, topicDescription: string | null): string {
  return `You are a friendly, encouraging science tutor helping 8th grade students review "${topicTitle}".
${topicDescription ? `\nTopic summary: ${topicDescription}\n` : ''}
Your rules:
- Keep every response SHORT: 2–4 sentences max. Students are reviewing, not reading a textbook.
- Be conversational and enthusiastic — like a cool teacher who actually gets it.
- Only answer questions related to ${topicTitle} or directly supporting science concepts.
- If a student asks about something unrelated, warmly redirect them: "Great curiosity! Let's stick to ${topicTitle} for now — ask me anything about it!"
- Use simple analogies and real-world examples that 8th graders can relate to.
- Never sound like a textbook. Sound like a human who loves science.
- If a student is confused or stuck, be extra patient and encouraging.`
}
