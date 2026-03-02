import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface EmailPreference {
  id: string
  user_id: string
  daily_summary_enabled: boolean
  timezone: string
  created_at: string
}

export function useEmailPreferences() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['emailPreferences', user?.id],
    queryFn: async () => {
      if (!user) return null

      const { data, error } = await supabase
        .from('email_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) throw error
      return data as EmailPreference | null
    },
    enabled: !!user,
  })
}

export function useUpdateEmailPreferences() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (params: { enabled?: boolean; timezone?: string }) => {
      if (!user) throw new Error('Not authenticated')

      const updates: Record<string, unknown> = { user_id: user.id }
      if (params.enabled !== undefined) updates.daily_summary_enabled = params.enabled
      if (params.timezone !== undefined) updates.timezone = params.timezone

      const { data, error } = await supabase
        .from('email_preferences')
        .upsert(updates, { onConflict: 'user_id' })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailPreferences', user?.id] })
    },
  })
}
