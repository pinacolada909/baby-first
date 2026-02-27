import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import type { StandingSession } from '@/types'

export function useStandingSessions(babyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.standingSessions.byBaby(babyId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('standing_sessions')
        .select('*')
        .eq('baby_id', babyId!)
        .order('start_time', { ascending: false })
      if (error) throw error
      return data as StandingSession[]
    },
    enabled: !!babyId,
  })
}

export function useStartStanding() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: { baby_id: string; caregiver_id: string }) => {
      const { data, error } = await supabase
        .from('standing_sessions')
        .insert({
          baby_id: params.baby_id,
          caregiver_id: params.caregiver_id,
          start_time: new Date().toISOString(),
          end_time: null,
        })
        .select()
        .single()
      if (error) throw error
      return data as StandingSession
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.standingSessions.byBaby(data.baby_id) })
    },
  })
}

export function useStopStanding() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, babyId }: { id: string; babyId: string }) => {
      const { data, error } = await supabase
        .from('standing_sessions')
        .update({ end_time: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return { ...data, baby_id: babyId } as StandingSession
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.standingSessions.byBaby(variables.babyId) })
    },
  })
}
