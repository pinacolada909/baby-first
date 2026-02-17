const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const VALID_TRACKER_TYPES = ['sleep', 'feeding', 'diaper'] as const
type TrackerType = (typeof VALID_TRACKER_TYPES)[number]

function buildSystemPrompt(trackerType: TrackerType, currentTime: string): string {
  const base = `You are a parser for a baby tracking app. Given a natural language transcript from a caregiver, extract structured data for the "${trackerType}" tracker. The user may speak in English or Chinese (Simplified).

Current date and time: ${currentTime}

Rules:
- If a field cannot be determined from the transcript, set it to null
- For relative times like "just now" or "an hour ago", compute from the current time
- For ambiguous times like "2pm", use today's date
- Chinese input mappings: "母乳" = breastmilk, "配方奶" = formula, "即饮奶" = ready_to_feed, "湿" = wet, "脏" = dirty, "混合" = mixed, "干" = dry
- Return ONLY valid JSON, no markdown formatting or code blocks
- All datetime values must be ISO 8601 format

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
  }

  return base + schemas[trackerType] + `

Set confidence to "low" if the transcript doesn't seem related to baby care or the tracker type.
Set confidence to "medium" if some fields are ambiguous or missing.
Set confidence to "high" if all relevant fields are clearly specified.`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not set')
    }

    const { transcript, tracker_type, language } = await req.json()

    if (!transcript || typeof transcript !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'transcript is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (!VALID_TRACKER_TYPES.includes(tracker_type)) {
      return new Response(
        JSON.stringify({ success: false, error: 'tracker_type must be sleep, feeding, or diaper' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const currentTime = new Date().toISOString()
    const systemPrompt = buildSystemPrompt(tracker_type, currentTime)

    // Call Gemini API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
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
      }),
    })

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error('Gemini API error:', errorText)
      throw new Error(`Gemini API returned ${geminiResponse.status}`)
    }

    const geminiData = await geminiResponse.json()
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
