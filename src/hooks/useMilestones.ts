import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import type { MilestoneRecord } from '@/types'

export function useMilestones(babyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.milestones.byBaby(babyId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('milestones')
        .select('*')
        .eq('baby_id', babyId!)
      if (error) throw error
      return data as MilestoneRecord[]
    },
    enabled: !!babyId,
  })
}

export function useToggleMilestone() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      babyId,
      milestoneKey,
      achieved,
    }: {
      babyId: string
      milestoneKey: string
      achieved: boolean
    }) => {
      if (achieved) {
        // Mark as achieved
        const { error } = await supabase
          .from('milestones')
          .insert({ baby_id: babyId, milestone_key: milestoneKey })
        if (error) throw error
      } else {
        // Unmark
        const { error } = await supabase
          .from('milestones')
          .delete()
          .eq('baby_id', babyId)
          .eq('milestone_key', milestoneKey)
        if (error) throw error
      }
      return { babyId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.milestones.byBaby(data.babyId) })
    },
  })
}
