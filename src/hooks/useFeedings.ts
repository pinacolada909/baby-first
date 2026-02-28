import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import type { Feeding } from '@/types'

export function useFeedings(babyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.feeding.byBaby(babyId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedings')
        .select('*')
        .eq('baby_id', babyId!)
        .order('fed_at', { ascending: false })
      if (error) throw error
      return data as Feeding[]
    },
    enabled: !!babyId,
  })
}

export function useAddFeeding() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (feeding: Omit<Feeding, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('feedings')
        .insert(feeding)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feeding.byBaby(data.baby_id) })
    },
  })
}

export function useDeleteFeeding() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, babyId }: { id: string; babyId: string }) => {
      const { error } = await supabase.from('feedings').delete().eq('id', id).eq('baby_id', babyId)
      if (error) throw error
      return { babyId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feeding.byBaby(data.babyId) })
    },
  })
}
