import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SignInForm } from './SignInForm'
import { SignUpForm } from './SignUpForm'
import { ForgotPasswordForm } from './ForgotPasswordForm'

interface AuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const { t } = useLanguage()
  const [view, setView] = useState<'auth' | 'forgotPassword'>('auth')

  const handleSuccess = () => {
    onOpenChange(false)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setView('auth') // Reset to auth view when closing
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {view === 'forgotPassword' ? t('auth.forgotPassword.title') : 'BabyFirst'}
          </DialogTitle>
          <DialogDescription>
            {view === 'forgotPassword' ? t('auth.forgotPassword.description') : t('auth.demo.login')}
          </DialogDescription>
        </DialogHeader>

        {view === 'forgotPassword' ? (
          <ForgotPasswordForm onBackToSignIn={() => setView('auth')} />
        ) : (
          <Tabs defaultValue="signIn" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="signIn" className="flex-1">
                {t('auth.signIn')}
              </TabsTrigger>
              <TabsTrigger value="signUp" className="flex-1">
                {t('auth.signUp')}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="signIn" className="mt-4">
              <SignInForm onSuccess={handleSuccess} onForgotPassword={() => setView('forgotPassword')} />
            </TabsContent>
            <TabsContent value="signUp" className="mt-4">
              <SignUpForm onSuccess={handleSuccess} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
