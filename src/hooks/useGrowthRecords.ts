import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import type { GrowthRecord } from '@/types'

export function useGrowthRecords(babyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.growth.byBaby(babyId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('growth_records')
        .select('*')
        .eq('baby_id', babyId!)
        .order('measured_at', { ascending: false })
      if (error) throw error
      return data as GrowthRecord[]
    },
    enabled: !!babyId,
  })
}

export function useAddGrowthRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (record: Omit<GrowthRecord, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('growth_records')
        .insert(record)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.growth.byBaby(data.baby_id) })
    },
  })
}

export function useDeleteGrowthRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, babyId }: { id: string; babyId: string }) => {
      const { error } = await supabase.from('growth_records').delete().eq('id', id)
      if (error) throw error
      return { babyId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.growth.byBaby(data.babyId) })
    },
  })
}
