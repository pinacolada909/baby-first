import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import { sanitizeErrorMessage } from '@/lib/utils'
import { toast } from 'sonner'

const STORAGE_KEY = 'babystep-pending-signup-action'

type PendingAction =
  | { type: 'create_baby'; babyName: string; displayName: string }
  | { type: 'redeem_invite'; code: string; displayName: string }

export function setPendingSignupAction(action: PendingAction) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(action))
}

export function clearPendingSignupAction() {
  sessionStorage.removeItem(STORAGE_KEY)
}

function getPendingSignupAction(): PendingAction | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)

    // Runtime validation
    if (typeof parsed !== 'object' || parsed === null) return null
    const obj = parsed as Record<string, unknown>
    if (obj.type === 'create_baby') {
      if (typeof obj.babyName !== 'string' || typeof obj.displayName !== 'string') return null
      if (obj.babyName.length > 100 || obj.displayName.length > 50) return null
      return { type: 'create_baby', babyName: obj.babyName, displayName: obj.displayName }
    }
    if (obj.type === 'redeem_invite') {
      if (typeof obj.code !== 'string' || typeof obj.displayName !== 'string') return null
      if (obj.code.length > 6 || obj.displayName.length > 50) return null
      return { type: 'redeem_invite', code: obj.code, displayName: obj.displayName }
    }
    return null
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
        const message = err instanceof Error ? sanitizeErrorMessage(err.message) : t('common.error')
        toast.error(message)
      } finally {
        clearPendingSignupAction()
        executingRef.current = false
      }
    }

    execute()
  }, [user, session, queryClient, navigate, t])
}
