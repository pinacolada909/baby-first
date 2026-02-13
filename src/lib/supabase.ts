import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

// When env vars are missing (demo mode), create a client that will fail
// gracefully — all queries will error, and the app falls back to demo state.
export const supabase = createClient(
  supabaseUrl || 'https://localhost',
  supabaseAnonKey || 'demo-only',
)
