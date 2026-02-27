const ALLOWED_ORIGINS = [
  'https://baby-first-iota.vercel.app',
  'http://localhost:5173',
]

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || ''
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

const VALID_TRACKER_TYPES = ['sleep', 'feeding', 'diaper', 'growth', 'pumping'] as const
type TrackerType = (typeof VALID_TRACKER_TYPES)[number]

function buildSystemPrompt(trackerType: TrackerType, currentTime: string): string {
  const base = `You are a parser for a baby tracking app. Given a natural language transcript from a caregiver, extract structured data for the "${trackerType}" tracker. The user may speak in English or Chinese (Simplified).

Current date and time: ${currentTime}

Rules:
- If a field cannot be determined from the transcript, set it to null
- For relative times like "just now" or "an hour ago", compute from the current time
- For ambiguous times like "2pm", use today's date
- IMPORTANT: All times are in the user's local timezone shown above. Return datetime values as local times WITHOUT a Z suffix or timezone offset (e.g. "2026-02-17T14:00:00", NOT "2026-02-17T14:00:00Z")
- Chinese input mappings: "母乳" = breastmilk, "配方奶" = formula, "即饮奶" = ready_to_feed, "湿" = wet, "脏" = dirty, "混合" = mixed, "干" = dry
- Return ONLY valid JSON, no markdown formatting or code blocks
- All datetime values must be ISO 8601 format without timezone offset

`

  const schemas: Record<TrackerType, string> = {
    sleep: `Extract these fields:
- start_time: ISO 8601 datetime string, or null
- end_time: ISO 8601 datetime string, or null
- notes: any additional info not fitting other fields, or null

Respond with: { "data": { "start_time": ..., "end_time": ..., "notes": ... }, "confidence": "high"|"medium"|"low" }`,

    feeding: `Extract these fields:
- time: ISO 8601 datetime string (default: current time if not specified), or null
- feeding_type: one of "breastmilk", "formula", "ready_to_feed", or null
- volume_ml: number (milliliters), or null
- duration_minutes: number (primarily for breastmilk), or null
- notes: any additional info not fitting other fields, or null

Respond with: { "data": { "time": ..., "feeding_type": ..., "volume_ml": ..., "duration_minutes": ..., "notes": ... }, "confidence": "high"|"medium"|"low" }`,

    diaper: `Extract these fields:
- time: ISO 8601 datetime string (default: current time if not specified), or null
- status: one of "wet", "dirty", "mixed", "dry", or null
- notes: any additional info not fitting other fields, or null

Respond with: { "data": { "time": ..., "status": ..., "notes": ... }, "confidence": "high"|"medium"|"low" }`,

    growth: `Extract these fields:
- date: ISO 8601 date string (default: today if not specified), or null
- weight_kg: number (kilograms, e.g. 4.5), or null
- height_cm: number (centimeters, e.g. 55.0), or null
- head_cm: number (head circumference in centimeters, e.g. 38.0), or null
- notes: any additional info not fitting other fields, or null

Chinese input mappings: "公斤/千克/斤" = kg (note: 1斤 = 0.5kg), "厘米/公分" = cm, "头围" = head circumference, "身高/身长" = height, "体重" = weight

Respond with: { "data": { "date": ..., "weight_kg": ..., "height_cm": ..., "head_cm": ..., "notes": ... }, "confidence": "high"|"medium"|"low" }`,

    pumping: `Extract these fields:
- time: ISO 8601 datetime string (default: current time if not specified), or null
- duration_minutes: number (minutes), or null
- volume_ml: number (milliliters), or null
- side: one of "left", "right", "both", or null
- storage: one of "fed_immediately", "fridge", "freezer", or null
- notes: any additional info not fitting other fields, or null

Chinese input mappings: "左边/左侧/左" = left, "右边/右侧/右" = right, "双侧/两侧/两边" = both, "直接喂/直接吃" = fed_immediately, "冰箱/冷藏" = fridge, "冷冻/冻" = freezer, "吸奶/泵奶/挤奶" = pumping, "毫升/ml" = milliliters

Respond with: { "data": { "time": ..., "duration_minutes": ..., "volume_ml": ..., "side": ..., "storage": ..., "notes": ... }, "confidence": "high"|"medium"|"low" }`,
  }

  return base + schemas[trackerType] + `

Set confidence to "low" if the transcript doesn't seem related to baby care or the tracker type.
Set confidence to "medium" if some fields are ambiguous or missing.
Set confidence to "high" if all relevant fields are clearly specified.`
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Require authentication
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  try {
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not set')
    }

    const { transcript, tracker_type, language, timezone, local_time } = await req.json()

    if (!transcript || typeof transcript !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'transcript is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (!VALID_TRACKER_TYPES.includes(tracker_type)) {
      return new Response(
        JSON.stringify({ success: false, error: 'tracker_type must be sleep, feeding, diaper, growth, or pumping' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Use the client's local time directly (most reliable) or fall back to server-side conversion
    let currentTime: string
    if (local_time) {
      currentTime = `${local_time} (timezone: ${timezone || 'unknown'})`
    } else {
      const userTimezone = timezone || 'UTC'
      const now = new Date()
      const currentTimeLocal = now.toLocaleString('en-US', { timeZone: userTimezone, dateStyle: 'full', timeStyle: 'long' })
      currentTime = `${currentTimeLocal} (timezone: ${userTimezone})`
    }
    const systemPrompt = buildSystemPrompt(tracker_type, currentTime)

    // Call Gemini API with retry and model fallback
    const models = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash-lite']
    const requestBody = JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [
        {
          role: 'user',
          parts: [{ text: `Tracker type: ${tracker_type}\nLanguage: ${language || 'en'}\nTranscript: "${transcript}"` }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    })

    let geminiData = null
    let lastError = ''

    for (const model of models) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`

      // Retry up to 3 times with exponential backoff for rate limits
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) {
          const delay = 1000 * Math.pow(2, attempt) // 2s, 4s
          await new Promise((r) => setTimeout(r, delay))
        }

        const geminiResponse = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody,
        })

        if (geminiResponse.ok) {
          geminiData = await geminiResponse.json()
          break
        }

        const errorText = await geminiResponse.text()
        lastError = `${model} returned ${geminiResponse.status}`
        console.error(`Gemini API error (${model}, attempt ${attempt + 1}):`, errorText)

        // Only retry on 429 (rate limit) or 503 (overloaded)
        if (geminiResponse.status !== 429 && geminiResponse.status !== 503) {
          break
        }
      }

      if (geminiData) break
    }

    if (!geminiData) {
      throw new Error(lastError || 'All Gemini models failed')
    }

    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text

    if (!responseText) {
      throw new Error('No response from Gemini')
    }

    const parsed = JSON.parse(responseText)

    return new Response(
      JSON.stringify({ success: true, data: parsed.data, confidence: parsed.confidence || 'medium' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('parse-voice-input error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Failed to parse voice input' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
