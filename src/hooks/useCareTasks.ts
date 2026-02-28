import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import type { CareTask } from '@/types'

export function useCareTasks(babyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.careTasks.byBaby(babyId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('care_tasks')
        .select('*')
        .eq('baby_id', babyId!)
        .order('assigned_at', { ascending: false })
      if (error) throw error
      return data as CareTask[]
    },
    enabled: !!babyId,
  })
}

export function useAddCareTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (task: Omit<CareTask, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('care_tasks')
        .insert(task)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.careTasks.byBaby(data.baby_id) })
    },
  })
}

export function useToggleTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, babyId, completed }: { id: string; babyId: string; completed: boolean }) => {
      const { data, error } = await supabase
        .from('care_tasks')
        .update({
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq('id', id)
        .eq('baby_id', babyId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.careTasks.byBaby(variables.babyId) })
    },
  })
}

export function useDeleteCareTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, babyId }: { id: string; babyId: string }) => {
      const { error } = await supabase.from('care_tasks').delete().eq('id', id).eq('baby_id', babyId)
      if (error) throw error
      return { babyId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.careTasks.byBaby(data.babyId) })
    },
  })
}
