import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useRealtimeSync(
  table: string,
  babyId: string | undefined,
  queryKey: readonly unknown[]
) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!babyId) return

    const channel = supabase
      .channel(`${table}-${babyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `baby_id=eq.${babyId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, babyId, queryClient, queryKey])
}
