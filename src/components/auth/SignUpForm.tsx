import { useState } from 'react'
import type { FormEvent } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { setPendingSignupAction } from '@/hooks/usePendingSignupAction'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

interface SignUpFormProps {
  onSuccess: () => void
  defaultRole?: 'new_baby' | 'join_existing'
  defaultInviteCode?: string
}

export function SignUpForm({ onSuccess, defaultRole = 'new_baby', defaultInviteCode = '' }: SignUpFormProps) {
  const { t } = useLanguage()
  const { signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [babyName, setBabyName] = useState('')
  const [inviteCode, setInviteCode] = useState(defaultInviteCode)
  const [role, setRole] = useState<'new_baby' | 'join_existing'>(defaultRole)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Store the pending action before sign-up so it persists even if email confirmation is needed
      if (role === 'new_baby') {
        setPendingSignupAction({
          type: 'create_baby',
          babyName: babyName.trim(),
          displayName: displayName.trim(),
        })
      } else {
        setPendingSignupAction({
          type: 'redeem_invite',
          code: inviteCode.trim().toUpperCase(),
          displayName: displayName.trim(),
        })
      }

      const { error, confirmationRequired } = await signUp(email, password, displayName)
      if (error) {
        // Clear the pending action since sign-up failed
        localStorage.removeItem('babyfirst-pending-signup-action')
        toast.error(error.message || t('auth.error.generic'))
      } else if (confirmationRequired) {
        toast.success(t('auth.signUp.confirmEmail'))
        onSuccess()
      } else {
        toast.success(t('auth.signUp.success'))
        onSuccess()
      }
    } catch (err) {
      localStorage.removeItem('babyfirst-pending-signup-action')
      toast.error(err instanceof Error ? err.message : t('auth.error.generic'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Tabs value={role} onValueChange={(v) => setRole(v as 'new_baby' | 'join_existing')}>
        <TabsList className="w-full">
          <TabsTrigger value="new_baby" className="flex-1 text-xs">
            {t('auth.signUp.role.newBaby')}
          </TabsTrigger>
          <TabsTrigger value="join_existing" className="flex-1 text-xs">
            {t('auth.signUp.role.joinExisting')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="new_baby" />
        <TabsContent value="join_existing" />
      </Tabs>

      <div className="space-y-2">
        <Label htmlFor="signup-display-name">{t('auth.displayName')}</Label>
        <Input
          id="signup-display-name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          autoComplete="name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-email">{t('auth.email')}</Label>
        <Input
          id="signup-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password">{t('auth.password')}</Label>
        <Input
          id="signup-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
        />
      </div>

      {role === 'new_baby' ? (
        <div className="space-y-2">
          <Label htmlFor="signup-baby-name">{t('auth.signUp.babyName')}</Label>
          <Input
            id="signup-baby-name"
            value={babyName}
            onChange={(e) => setBabyName(e.target.value)}
            required
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="signup-invite-code">{t('auth.signUp.inviteCode')}</Label>
          <Input
            id="signup-invite-code"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={6}
            required
            className="font-mono text-lg tracking-wider uppercase"
          />
        </div>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? t('common.loading') : t('auth.signUp')}
      </Button>
    </form>
  )
}
