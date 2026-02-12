import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface EmailPreference {
  id: string
  user_id: string
  daily_summary_enabled: boolean
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
    mutationFn: async (enabled: boolean) => {
      if (!user) throw new Error('Not authenticated')

      // Upsert the preference
      const { data, error } = await supabase
        .from('email_preferences')
        .upsert(
          {
            user_id: user.id,
            daily_summary_enabled: enabled,
          },
          {
            onConflict: 'user_id',
          }
        )
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
