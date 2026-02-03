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

interface AuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const { t } = useLanguage()

  const handleSuccess = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>BabyFirst</DialogTitle>
          <DialogDescription>{t('auth.demo.login')}</DialogDescription>
        </DialogHeader>
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
            <SignInForm onSuccess={handleSuccess} />
          </TabsContent>
          <TabsContent value="signUp" className="mt-4">
            <SignUpForm onSuccess={handleSuccess} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
