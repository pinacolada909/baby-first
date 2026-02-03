import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import { useAuth } from '@/contexts/AuthContext'

export function useCreateBaby() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async ({ name, birthDate }: { name: string; birthDate?: string }) => {
      const { data: baby, error: babyError } = await supabase
        .from('babies')
        .insert({ name, birth_date: birthDate || null })
        .select()
        .single()
      if (babyError) throw babyError

      const { error: cgError } = await supabase
        .from('baby_caregivers')
        .insert({
          baby_id: baby.id,
          user_id: user!.id,
          role: 'primary',
          display_name: user!.user_metadata?.display_name || 'Parent',
        })
      if (cgError) throw cgError
      return baby
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.babies.all(user!.id) })
    },
  })
}

export function useDeleteBaby() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (babyId: string) => {
      const { error } = await supabase.from('babies').delete().eq('id', babyId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.babies.all(user!.id) })
    },
  })
}
