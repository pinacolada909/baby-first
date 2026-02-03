import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import type { BabyCaregiver } from '@/types'

export function useCaregivers(babyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.caregivers.byBaby(babyId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('baby_caregivers')
        .select('*, profiles:user_id(display_name)')
        .eq('baby_id', babyId!)
      if (error) throw error
      return data as (BabyCaregiver & { profiles: { display_name: string } | null })[]
    },
    enabled: !!babyId,
  })
}

export function useRemoveCaregiver() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ babyId, userId }: { babyId: string; userId: string }) => {
      const { error } = await supabase
        .from('baby_caregivers')
        .delete()
        .eq('baby_id', babyId)
        .eq('user_id', userId)
      if (error) throw error
      return { babyId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.caregivers.byBaby(data.babyId) })
    },
  })
}
