// Baby profile management hooks
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import { useAuth } from '@/contexts/AuthContext'

export function useCreateBaby() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async ({ name, birthDate }: { name: string; birthDate?: string }) => {
      const { data, error } = await supabase.rpc('create_baby_with_caregiver', {
        _name: name,
        _birth_date: birthDate || null,
        _display_name: user?.user_metadata?.display_name || 'Parent',
      })
      if (error) throw error
      return data as string // returns the baby UUID
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
