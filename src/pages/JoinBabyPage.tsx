import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { useRedeemInvite } from '@/hooks/useInvites'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SignInForm } from '@/components/auth/SignInForm'
import { SignUpForm } from '@/components/auth/SignUpForm'
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'
import { UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { sanitizeErrorMessage } from '@/lib/utils'

export function JoinBabyPage() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const redeemInvite = useRedeemInvite()

  const codeFromUrl = searchParams.get('code') ?? ''
  const [inviteCode, setInviteCode] = useState(codeFromUrl.toUpperCase())
  const [displayName, setDisplayName] = useState('')
  const [authView, setAuthView] = useState<'auth' | 'forgotPassword'>('auth')

  // Pre-fill display name from user metadata after sign-in
  useEffect(() => {
    if (user && !displayName) {
      const name = user.user_metadata?.display_name ?? ''
      setDisplayName(name)
    }
  }, [user, displayName])

  const handleJoin = async () => {
    if (!inviteCode.trim() || !displayName.trim()) return
    try {
      await redeemInvite.mutateAsync({
        code: inviteCode.trim().toUpperCase(),
        displayName: displayName.trim(),
      })
      toast.success(t('caregiver.joined'))
      navigate('/')
    } catch (err) {
      const message = err instanceof Error ? err.message : t('common.error')
      // Map known DB errors to translated messages
      if (message.includes('already a caregiver')) {
        toast.error(t('join.error.alreadyMember'))
      } else if (message.includes('Invalid or expired')) {
        toast.error(t('join.error.invalidCode'))
      } else {
        toast.error(sanitizeErrorMessage(message))
      }
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-8">
      <div className="text-center">
        <UserPlus className="mx-auto h-12 w-12 text-purple-500" />
        <h1 className="mt-4 text-2xl font-bold">{t('join.title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('join.subtitle')}</p>
      </div>

      {!user ? (
        <Card>
          <CardContent className="p-6">
            <p className="mb-4 text-sm text-muted-foreground">{t('join.signInFirst')}</p>
            {authView === 'forgotPassword' ? (
              <ForgotPasswordForm onBackToSignIn={() => setAuthView('auth')} />
            ) : (
              <Tabs defaultValue="signUp">
                <TabsList className="w-full">
                  <TabsTrigger value="signIn" className="flex-1">{t('auth.signIn')}</TabsTrigger>
                  <TabsTrigger value="signUp" className="flex-1">{t('auth.signUp')}</TabsTrigger>
                </TabsList>
                <TabsContent value="signIn" className="mt-4">
                  <SignInForm onSuccess={() => {}} onForgotPassword={() => setAuthView('forgotPassword')} />
                </TabsContent>
                <TabsContent value="signUp" className="mt-4">
                  <SignUpForm
                    onSuccess={() => {}}
                    defaultRole="join_existing"
                    defaultInviteCode={inviteCode}
                  />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="space-y-2">
              <Label htmlFor="join-code">{t('caregiver.join.code')}</Label>
              <Input
                id="join-code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
                className="font-mono text-lg tracking-wider uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="join-name">{t('caregiver.join.name')}</Label>
              <Input
                id="join-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t('caregiver.join.name')}
                maxLength={50}
              />
            </div>
            <Button
              onClick={handleJoin}
              disabled={redeemInvite.isPending || !inviteCode.trim() || !displayName.trim()}
              className="w-full"
            >
              {redeemInvite.isPending ? t('common.loading') : t('caregiver.join.button')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
