import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'
import type { BabyInvite } from '@/types'

const INVITE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateInviteCode(length = 6): string {
  const values = new Uint8Array(length)
  crypto.getRandomValues(values)
  let code = ''
  for (let i = 0; i < length; i++) {
    code += INVITE_CHARS[values[i] % INVITE_CHARS.length]
  }
  return code
}

export function useInvites(babyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.invites.byBaby(babyId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('baby_invites')
        .select('*')
        .eq('baby_id', babyId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as BabyInvite[]
    },
    enabled: !!babyId,
  })
}

export function useCreateInvite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ babyId, createdBy }: { babyId: string; createdBy: string }) => {
      const code = generateInviteCode()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      const { data, error } = await supabase
        .from('baby_invites')
        .insert({
          baby_id: babyId,
          code,
          created_by: createdBy,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invites.byBaby(data.baby_id) })
    },
  })
}

export function useRedeemInvite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ code, displayName }: { code: string; displayName: string }) => {
      const { data, error } = await supabase.rpc('redeem_invite', {
        _code: code,
        _display_name: displayName,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['babies'] })
    },
  })
}
