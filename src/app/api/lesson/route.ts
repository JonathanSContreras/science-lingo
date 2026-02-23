import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'


export async function POST(req: Request) {
  try {
    // ── Auth gate ──
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // ── Parse body ──
    const { topicTitle, topicDescription, standard } = await req.json() as {
      topicTitle: string
      topicDescription: string | null
      standard: string | null
    }

    if (!topicTitle) {
      return Response.json({ error: 'Missing topicTitle' }, { status: 400 })
    }

    // ── API key ──
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error('[lesson] GEMINI_API_KEY not set')
      return Response.json({ error: 'AI service not configured' }, { status: 503 })
    }

    // ── Gemini setup ──
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: buildLessonSystemPrompt(),
    })

    const prompt = buildLessonPrompt(topicTitle, topicDescription, standard)

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 800,
        temperature: 0.7,
        responseMimeType: 'application/json',
      },
    })

    const raw = result.response.text().trim()

    // Parse and validate the JSON
    let lesson: LessonContent
    try {
      lesson = JSON.parse(raw)
    } catch {
      console.error('[lesson] Failed to parse Gemini JSON:', raw)
      return Response.json({ error: 'Failed to generate lesson' }, { status: 500 })
    }

    return Response.json({ lesson })
  } catch (err) {
    console.error('[lesson/route]', err)
    return Response.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type LessonContent = {
  hook: string
  concepts: Array<{ title: string; explanation: string; emoji: string }>
  quickTip: string
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

function buildLessonSystemPrompt(): string {
  return `You are an engaging science teacher creating a quick mini-lesson for 8th grade students before they take a quiz. Your lessons are the opposite of boring textbooks — they're punchy, clear, and actually interesting.

You always return valid JSON in exactly this format:
{
  "hook": "A one-sentence attention-grabber that makes the topic feel exciting or relevant to real life.",
  "concepts": [
    {
      "emoji": "one relevant emoji",
      "title": "Short concept title (3-6 words)",
      "explanation": "2-3 sentences explaining this concept conversationally. Use analogies, real-world examples, or surprising facts. No textbook language."
    }
  ],
  "quickTip": "One sentence telling students what to pay extra attention to in the quiz."
}

Rules:
- Return 3 to 4 concepts. Never more, never less.
- Keep explanations conversational — like texting a friend who happens to be a science genius.
- Each emoji should actually match the concept, not just look cool.
- The hook must make someone who doesn't care about science actually want to keep reading.
- The quickTip should feel like insider advice, not a warning.
- Only return valid JSON. No extra text, no markdown code fences.`
}

function buildLessonPrompt(
  topicTitle: string,
  topicDescription: string | null,
  standard: string | null
): string {
  const parts = [`Generate a mini-lesson for the topic: "${topicTitle}"`]
  if (standard) parts.push(`Science standard: ${standard}`)
  if (topicDescription) parts.push(`Topic context: ${topicDescription}`)
  parts.push('Return the lesson as JSON following your instructions.')
  return parts.join('\n')
}
