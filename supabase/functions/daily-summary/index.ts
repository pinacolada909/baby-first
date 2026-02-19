import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@2'
// btoa is available globally in Deno

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SleepSession {
  start_time: string
  end_time: string
  duration_hours: number
  notes: string | null
}

interface DiaperChange {
  changed_at: string
  status: string
  notes: string | null
}

interface Feeding {
  fed_at: string
  feeding_type: string
  volume_ml: number | null
  duration_minutes: number | null
  notes: string | null
}

function formatDate(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function generateSleepCSV(sessions: SleepSession[]): string {
  const header = 'Start Time,End Time,Duration (hours),Notes'
  const rows = sessions.map(s =>
    `${formatDate(s.start_time)},${formatDate(s.end_time)},${s.duration_hours.toFixed(1)},${s.notes || ''}`
  )
  return [header, ...rows].join('\n')
}

function generateDiaperCSV(changes: DiaperChange[]): string {
  const header = 'Time,Type,Notes'
  const rows = changes.map(d =>
    `${formatDate(d.changed_at)},${d.status},${d.notes || ''}`
  )
  return [header, ...rows].join('\n')
}

function generateFeedingCSV(feedings: Feeding[]): string {
  const header = 'Time,Type,Volume (mL),Duration (min),Notes'
  const rows = feedings.map(f =>
    `${formatDate(f.fed_at)},${f.feeding_type},${f.volume_ml || ''},${f.duration_minutes || ''},${f.notes || ''}`
  )
  return [header, ...rows].join('\n')
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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

    // Get all users who have enabled daily summary
    const { data: preferences, error: prefError } = await supabase
      .from('email_preferences')
      .select('user_id')
      .eq('daily_summary_enabled', true)

    if (prefError) {
      throw new Error(`Failed to fetch preferences: ${prefError.message}`)
    }

    if (!preferences || preferences.length === 0) {
      return new Response(JSON.stringify({ message: 'No users with daily summary enabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get today's date range in PST
    const now = new Date()
    const pstOffset = -8 * 60 // PST is UTC-8
    const pstNow = new Date(now.getTime() + (pstOffset + now.getTimezoneOffset()) * 60000)
    const todayStart = new Date(pstNow.getFullYear(), pstNow.getMonth(), pstNow.getDate())
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

    const todayStartISO = todayStart.toISOString()
    const todayEndISO = todayEnd.toISOString()

    const results: { userId: string; success: boolean; error?: string }[] = []

    for (const pref of preferences) {
      try {
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
        const babyNames = caregivers.map(c => (c.babies as { name: string })?.name || 'Baby').join(', ')

        // Fetch today's data for all babies
        const [sleepResult, diaperResult, feedingResult] = await Promise.all([
          supabase
            .from('sleep_sessions')
            .select('start_time, end_time, duration_hours, notes')
            .in('baby_id', babyIds)
            .gte('start_time', todayStartISO)
            .lt('start_time', todayEndISO)
            .order('start_time', { ascending: true }),
          supabase
            .from('diaper_changes')
            .select('changed_at, status, notes')
            .in('baby_id', babyIds)
            .gte('changed_at', todayStartISO)
            .lt('changed_at', todayEndISO)
            .order('changed_at', { ascending: true }),
          supabase
            .from('feedings')
            .select('fed_at, feeding_type, volume_ml, duration_minutes, notes')
            .in('baby_id', babyIds)
            .gte('fed_at', todayStartISO)
            .lt('fed_at', todayEndISO)
            .order('fed_at', { ascending: true }),
        ])

        const sleepData = (sleepResult.data || []) as SleepSession[]
        const diaperData = (diaperResult.data || []) as DiaperChange[]
        const feedingData = (feedingResult.data || []) as Feeding[]

        // Generate CSVs
        const sleepCSV = generateSleepCSV(sleepData)
        const diaperCSV = generateDiaperCSV(diaperData)
        const feedingCSV = generateFeedingCSV(feedingData)

        // Calculate summary stats
        const totalSleepHours = sleepData.reduce((sum, s) => sum + s.duration_hours, 0)
        const totalFeedings = feedingData.length
        const totalDiapers = diaperData.length
        const totalVolume = feedingData.reduce((sum, f) => sum + (f.volume_ml || 0), 0)

        const dateStr = pstNow.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })

        // Send email with Resend
        const { error: emailError } = await resend.emails.send({
          from: 'BabyStep <onboarding@resend.dev>',
          to: userEmail,
          subject: `Daily Summary for ${babyNames} - ${dateStr}`,
          html: `
            <h1>Daily Summary for ${babyNames}</h1>
            <p><strong>Date:</strong> ${dateStr}</p>

            <h2>Summary</h2>
            <ul>
              <li><strong>Total Sleep:</strong> ${totalSleepHours.toFixed(1)} hours (${sleepData.length} sessions)</li>
              <li><strong>Total Feedings:</strong> ${totalFeedings} (${totalVolume} mL total)</li>
              <li><strong>Diaper Changes:</strong> ${totalDiapers}</li>
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
              content: btoa(sleepCSV),
            },
            {
              filename: 'diaper_summary.csv',
              content: btoa(diaperCSV),
            },
            {
              filename: 'feeding_summary.csv',
              content: btoa(feedingCSV),
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
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
