import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import type { DiaperChange } from '@/types'

export function useDiaperChanges(babyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.diaper.byBaby(babyId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('diaper_changes')
        .select('*')
        .eq('baby_id', babyId!)
        .order('changed_at', { ascending: false })
      if (error) throw error
      return data as DiaperChange[]
    },
    enabled: !!babyId,
  })
}

export function useAddDiaperChange() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (change: Omit<DiaperChange, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('diaper_changes')
        .insert(change)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.diaper.byBaby(data.baby_id) })
    },
  })
}

export function useDeleteDiaperChange() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, babyId }: { id: string; babyId: string }) => {
      const { error } = await supabase.from('diaper_changes').delete().eq('id', id).eq('baby_id', babyId)
      if (error) throw error
      return { babyId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.diaper.byBaby(data.babyId) })
    },
  })
}
