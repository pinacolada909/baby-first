import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import type { TimeBlock } from '@/types'

export function useTimeBlocks(babyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.timeBlocks.byBaby(babyId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_blocks')
        .select('*')
        .eq('baby_id', babyId!)
        .order('start_time', { ascending: false })
      if (error) throw error
      return data as TimeBlock[]
    },
    enabled: !!babyId,
  })
}

export function useAddTimeBlock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (block: Omit<TimeBlock, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('time_blocks')
        .insert(block)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timeBlocks.byBaby(data.baby_id) })
    },
  })
}

export function useUpdateTimeBlock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, babyId, updates }: { id: string; babyId: string; updates: Partial<Pick<TimeBlock, 'end_time' | 'notes'>> }) => {
      const { data, error } = await supabase
        .from('time_blocks')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return { ...data, babyId }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timeBlocks.byBaby(variables.babyId) })
    },
  })
}

export function useDeleteTimeBlock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, babyId }: { id: string; babyId: string }) => {
      const { error } = await supabase.from('time_blocks').delete().eq('id', id)
      if (error) throw error
      return { babyId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timeBlocks.byBaby(data.babyId) })
    },
  })
}
