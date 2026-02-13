import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

const STORAGE_KEY = 'babyfirst-pending-signup-action'

type PendingAction =
  | { type: 'create_baby'; babyName: string; displayName: string }
  | { type: 'redeem_invite'; code: string; displayName: string }

export function setPendingSignupAction(action: PendingAction) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(action))
}

export function clearPendingSignupAction() {
  localStorage.removeItem(STORAGE_KEY)
}

function getPendingSignupAction(): PendingAction | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PendingAction
  } catch {
    return null
  }
}

export function usePendingSignupAction() {
  const { user, session } = useAuth()
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const executingRef = useRef(false)

  useEffect(() => {
    if (!user || !session) return
    if (executingRef.current) return

    const action = getPendingSignupAction()
    if (!action) return

    executingRef.current = true

    const execute = async () => {
      try {
        if (action.type === 'create_baby') {
          const { error } = await supabase.rpc('create_baby_with_caregiver', {
            _name: action.babyName,
            _birth_date: null,
            _display_name: action.displayName,
          })
          if (error) throw error
          toast.success(t('auth.signUp.babyCreated'))
        } else if (action.type === 'redeem_invite') {
          const { error } = await supabase.rpc('redeem_invite', {
            _code: action.code,
            _display_name: action.displayName,
          })
          if (error) throw error
          toast.success(t('auth.signUp.inviteRedeemed'))
        }

        // Invalidate babies query so BabyContext picks up the new baby
        await queryClient.invalidateQueries({ queryKey: ['babies'] })
        navigate('/')
      } catch (err) {
        const message = err instanceof Error ? err.message : t('common.error')
        toast.error(message)
      } finally {
        clearPendingSignupAction()
        executingRef.current = false
      }
    }

    execute()
  }, [user, session, queryClient, navigate, t])
}
