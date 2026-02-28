import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import type { SleepSession } from '@/types'

export function useSleepSessions(babyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.sleep.byBaby(babyId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sleep_sessions')
        .select('*')
        .eq('baby_id', babyId!)
        .order('start_time', { ascending: false })
      if (error) throw error
      return data as SleepSession[]
    },
    enabled: !!babyId,
  })
}

export function useAddSleep() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (session: Omit<SleepSession, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('sleep_sessions')
        .insert(session)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sleep.byBaby(data.baby_id) })
    },
  })
}

export function useDeleteSleep() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, babyId }: { id: string; babyId: string }) => {
      const { error } = await supabase.from('sleep_sessions').delete().eq('id', id).eq('baby_id', babyId)
      if (error) throw error
      return { babyId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sleep.byBaby(data.babyId) })
    },
  })
}
