import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import type { PumpingSession } from '@/types'

export function usePumpingSessions(babyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.pumping.byBaby(babyId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pumping_sessions')
        .select('*')
        .eq('baby_id', babyId!)
        .order('pumped_at', { ascending: false })
      if (error) throw error
      return data as PumpingSession[]
    },
    enabled: !!babyId,
  })
}

export function useAddPumping() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (session: Omit<PumpingSession, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('pumping_sessions')
        .insert(session)
        .select()
        .single()
      if (error) throw error

      // Auto-create milk stash entry if stored in fridge or freezer
      if (session.storage === 'fridge' || session.storage === 'freezer') {
        const { error: stashError } = await supabase
          .from('milk_stash')
          .insert({
            baby_id: session.baby_id,
            pumping_session_id: data.id,
            stored_at: session.pumped_at,
            storage_type: session.storage,
            volume_ml: session.volume_ml,
          })
        if (stashError) throw stashError
      }

      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pumping.byBaby(data.baby_id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.milkStash.byBaby(data.baby_id) })
    },
  })
}

export function useDeletePumping() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, babyId }: { id: string; babyId: string }) => {
      const { error } = await supabase.from('pumping_sessions').delete().eq('id', id).eq('baby_id', babyId)
      if (error) throw error
      return { babyId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pumping.byBaby(data.babyId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.milkStash.byBaby(data.babyId) })
    },
  })
}
