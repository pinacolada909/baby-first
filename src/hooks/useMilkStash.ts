import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import type { MilkStash } from '@/types'

export function useMilkStash(babyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.milkStash.byBaby(babyId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('milk_stash')
        .select('*')
        .eq('baby_id', babyId!)
        .order('stored_at', { ascending: false })
      if (error) throw error
      return data as MilkStash[]
    },
    enabled: !!babyId,
  })
}

export function useUseMilkStash() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ stashId, volumeMl, babyId }: { stashId: string; volumeMl: number; babyId: string }) => {
      const { error } = await supabase.rpc('use_milk_stash', {
        _stash_id: stashId,
        _volume_ml: volumeMl,
      })
      if (error) throw error
      return { babyId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.milkStash.byBaby(data.babyId) })
    },
  })
}

export function useDeleteMilkStash() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, babyId }: { id: string; babyId: string }) => {
      const { error } = await supabase.from('milk_stash').delete().eq('id', id).eq('baby_id', babyId)
      if (error) throw error
      return { babyId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.milkStash.byBaby(data.babyId) })
    },
  })
}
