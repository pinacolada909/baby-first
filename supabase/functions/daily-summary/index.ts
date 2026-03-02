import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@2'

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

// Encode a UTF-8 string to base64 (handles Chinese and other non-Latin1 characters)
function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

interface SleepSession {
  baby_id: string
  caregiver_id: string
  start_time: string
  end_time: string | null
  duration_hours: number | null
  notes: string | null
}

interface DiaperChange {
  baby_id: string
  caregiver_id: string
  changed_at: string
  status: string
  notes: string | null
}

interface Feeding {
  baby_id: string
  caregiver_id: string
  fed_at: string
  feeding_type: string
  volume_ml: number | null
  duration_minutes: number | null
  notes: string | null
}

interface PumpingSession {
  baby_id: string
  caregiver_id: string
  pumped_at: string
  duration_minutes: number | null
  volume_ml: number
  side: string
  storage: string
  notes: string | null
}

type NameMap = Record<string, string>

function formatDate(isoString: string, tz: string): string {
  const d = new Date(isoString)
  return d.toLocaleString('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function escapeCSV(value: string | number | null): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  // Prevent formula injection
  if (/^[=+\-@\t\r]/.test(str)) {
    return `"'${str.replace(/"/g, '""')}"`
  }
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function generateSleepCSV(
  sessions: SleepSession[],
  babyNames: NameMap,
  caregiverNames: NameMap,
  tz: string,
): string {
  const header = 'Baby,Logged By,Start Time,End Time,Duration (hours),Notes'
  const rows = sessions.map(s =>
    [
      escapeCSV(babyNames[s.baby_id] || 'Baby'),
      escapeCSV(caregiverNames[s.caregiver_id] || 'Unknown'),
      escapeCSV(formatDate(s.start_time, tz)),
      s.end_time ? escapeCSV(formatDate(s.end_time, tz)) : 'Ongoing',
      s.duration_hours != null ? s.duration_hours.toFixed(1) : '',
      escapeCSV(s.notes),
    ].join(',')
  )
  return '\uFEFF' + [header, ...rows].join('\n')
}

function generateDiaperCSV(
  changes: DiaperChange[],
  babyNames: NameMap,
  caregiverNames: NameMap,
  tz: string,
): string {
  const header = 'Baby,Logged By,Time,Type,Notes'
  const rows = changes.map(d =>
    [
      escapeCSV(babyNames[d.baby_id] || 'Baby'),
      escapeCSV(caregiverNames[d.caregiver_id] || 'Unknown'),
      escapeCSV(formatDate(d.changed_at, tz)),
      escapeCSV(d.status),
      escapeCSV(d.notes),
    ].join(',')
  )
  return '\uFEFF' + [header, ...rows].join('\n')
}

function generateFeedingCSV(
  feedings: Feeding[],
  babyNames: NameMap,
  caregiverNames: NameMap,
  tz: string,
): string {
  const header = 'Baby,Logged By,Time,Type,Volume (mL),Duration (min),Notes'
  const rows = feedings.map(f =>
    [
      escapeCSV(babyNames[f.baby_id] || 'Baby'),
      escapeCSV(caregiverNames[f.caregiver_id] || 'Unknown'),
      escapeCSV(formatDate(f.fed_at, tz)),
      escapeCSV(f.feeding_type),
      escapeCSV(f.volume_ml),
      escapeCSV(f.duration_minutes),
      escapeCSV(f.notes),
    ].join(',')
  )
  return '\uFEFF' + [header, ...rows].join('\n')
}

function generatePumpingCSV(
  sessions: PumpingSession[],
  babyNames: NameMap,
  caregiverNames: NameMap,
  tz: string,
): string {
  const header = 'Baby,Logged By,Time,Duration (min),Volume (mL),Side,Storage,Notes'
  const rows = sessions.map(s =>
    [
      escapeCSV(babyNames[s.baby_id] || 'Baby'),
      escapeCSV(caregiverNames[s.caregiver_id] || 'Unknown'),
      escapeCSV(formatDate(s.pumped_at, tz)),
      escapeCSV(s.duration_minutes),
      s.volume_ml,
      escapeCSV(s.side),
      escapeCSV(s.storage),
      escapeCSV(s.notes),
    ].join(',')
  )
  return '\uFEFF' + [header, ...rows].join('\n')
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Require cron secret for authentication
  const cronSecret = Deno.env.get('CRON_SECRET')
  const authHeader = req.headers.get('Authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not set')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const resend = new Resend(resendApiKey)

    // Get all users who have enabled daily summary (include timezone)
    const { data: preferences, error: prefError } = await supabase
      .from('email_preferences')
      .select('user_id, timezone')
      .eq('daily_summary_enabled', true)

    if (prefError) {
      throw new Error(`Failed to fetch preferences: ${prefError.message}`)
    }

    if (!preferences || preferences.length === 0) {
      return new Response(JSON.stringify({ message: 'No users with daily summary enabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const results: { userId: string; success: boolean; error?: string }[] = []

    for (const pref of preferences) {
      try {
        const timezone = pref.timezone || 'America/Los_Angeles'

        // Compute 24-hour summary window in the user's timezone
        const now = new Date()
        const userNow = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
        const userDateStr = `${userNow.getFullYear()}-${String(userNow.getMonth() + 1).padStart(2, '0')}-${String(userNow.getDate()).padStart(2, '0')}`

        // End: today at 8:00 PM in the user's timezone
        const userEnd = new Date(`${userDateStr}T20:00:00`)
        const userOffset = now.getTime() - userNow.getTime()
        const endUTC = new Date(userEnd.getTime() + userOffset)
        // Start: 24 hours before end
        const startUTC = new Date(endUTC.getTime() - 24 * 60 * 60 * 1000)

        const todayStartISO = startUTC.toISOString()
        const todayEndISO = endUTC.toISOString()

        // Get user's email from auth
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(pref.user_id)
        if (userError || !userData.user?.email) {
          results.push({ userId: pref.user_id, success: false, error: 'User email not found' })
          continue
        }
        const userEmail = userData.user.email

        // Get user's babies
        const { data: caregivers, error: cgError } = await supabase
          .from('baby_caregivers')
          .select('baby_id, babies(name)')
          .eq('user_id', pref.user_id)

        if (cgError || !caregivers || caregivers.length === 0) {
          results.push({ userId: pref.user_id, success: false, error: 'No babies found' })
          continue
        }

        const babyIds = caregivers.map(c => c.baby_id)
        const babyNameStr = caregivers.map(c => (c.babies as { name: string })?.name || 'Baby').join(', ')

        // Build baby name lookup map
        const babyNameMap: NameMap = {}
        for (const c of caregivers) {
          babyNameMap[c.baby_id] = (c.babies as { name: string })?.name || 'Baby'
        }

        // Build caregiver name lookup map (all caregivers for these babies)
        const { data: allCaregivers } = await supabase
          .from('baby_caregivers')
          .select('user_id, display_name')
          .in('baby_id', babyIds)

        const caregiverNameMap: NameMap = {}
        if (allCaregivers) {
          for (const cg of allCaregivers) {
            if (!caregiverNameMap[cg.user_id]) {
              caregiverNameMap[cg.user_id] = cg.display_name || 'Caregiver'
            }
          }
        }

        // Fetch today's data for all babies (include baby_id + caregiver_id)
        const [sleepResult, diaperResult, feedingResult, pumpingResult] = await Promise.all([
          supabase
            .from('sleep_sessions')
            .select('baby_id, caregiver_id, start_time, end_time, duration_hours, notes')
            .in('baby_id', babyIds)
            .gte('start_time', todayStartISO)
            .lt('start_time', todayEndISO)
            .order('start_time', { ascending: true }),
          supabase
            .from('diaper_changes')
            .select('baby_id, caregiver_id, changed_at, status, notes')
            .in('baby_id', babyIds)
            .gte('changed_at', todayStartISO)
            .lt('changed_at', todayEndISO)
            .order('changed_at', { ascending: true }),
          supabase
            .from('feedings')
            .select('baby_id, caregiver_id, fed_at, feeding_type, volume_ml, duration_minutes, notes')
            .in('baby_id', babyIds)
            .gte('fed_at', todayStartISO)
            .lt('fed_at', todayEndISO)
            .order('fed_at', { ascending: true }),
          supabase
            .from('pumping_sessions')
            .select('baby_id, caregiver_id, pumped_at, duration_minutes, volume_ml, side, storage, notes')
            .in('baby_id', babyIds)
            .gte('pumped_at', todayStartISO)
            .lt('pumped_at', todayEndISO)
            .order('pumped_at', { ascending: true }),
        ])

        const sleepData = (sleepResult.data || []) as SleepSession[]
        const diaperData = (diaperResult.data || []) as DiaperChange[]
        const feedingData = (feedingResult.data || []) as Feeding[]
        const pumpingData = (pumpingResult.data || []) as PumpingSession[]

        // Generate CSVs with baby name, caregiver name, and user timezone
        const sleepCSV = generateSleepCSV(sleepData, babyNameMap, caregiverNameMap, timezone)
        const diaperCSV = generateDiaperCSV(diaperData, babyNameMap, caregiverNameMap, timezone)
        const feedingCSV = generateFeedingCSV(feedingData, babyNameMap, caregiverNameMap, timezone)
        const pumpingCSV = generatePumpingCSV(pumpingData, babyNameMap, caregiverNameMap, timezone)

        // Calculate summary stats (handle null duration_hours for ongoing sleep)
        const totalSleepHours = sleepData.reduce((sum, s) => sum + (s.duration_hours ?? 0), 0)
        const totalFeedings = feedingData.length
        const totalDiapers = diaperData.length
        const totalVolume = feedingData.reduce((sum, f) => sum + (f.volume_ml || 0), 0)
        const totalPumping = pumpingData.length
        const totalPumpedMl = pumpingData.reduce((sum, p) => sum + p.volume_ml, 0)

        const dateStr = userNow.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })

        // Send email with Resend (use utf8ToBase64 for Chinese text support)
        const { error: emailError } = await resend.emails.send({
          from: 'BabyStep <onboarding@resend.dev>',
          to: userEmail,
          subject: `Daily Summary for ${babyNameStr} - ${dateStr}`,
          html: `
            <h1>Daily Summary for ${babyNameStr}</h1>
            <p><strong>Date:</strong> ${dateStr}</p>

            <h2>Summary</h2>
            <ul>
              <li><strong>Total Sleep:</strong> ${totalSleepHours.toFixed(1)} hours (${sleepData.length} sessions)</li>
              <li><strong>Total Feedings:</strong> ${totalFeedings} (${totalVolume} mL total)</li>
              <li><strong>Diaper Changes:</strong> ${totalDiapers}</li>
              <li><strong>Pumping Sessions:</strong> ${totalPumping} (${totalPumpedMl} mL total)</li>
            </ul>

            <p>Detailed CSV files are attached below.</p>

            <p style="color: #666; font-size: 12px;">
              This email was sent by BabyStep.
              You can disable daily summaries in the app settings.
            </p>
          `,
          attachments: [
            {
              filename: 'sleep_summary.csv',
              content: utf8ToBase64(sleepCSV),
            },
            {
              filename: 'diaper_summary.csv',
              content: utf8ToBase64(diaperCSV),
            },
            {
              filename: 'feeding_summary.csv',
              content: utf8ToBase64(feedingCSV),
            },
            {
              filename: 'pumping_summary.csv',
              content: utf8ToBase64(pumpingCSV),
            },
          ],
        })

        if (emailError) {
          results.push({ userId: pref.user_id, success: false, error: emailError.message })
        } else {
          results.push({ userId: pref.user_id, success: true })
        }
      } catch (err) {
        results.push({ userId: pref.user_id, success: false, error: String(err) })
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('daily-summary error:', error instanceof Error ? error.message : String(error))
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
