import { useState } from 'react'
import type { FormEvent } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { sanitizeErrorMessage } from '@/lib/utils'

interface ForgotPasswordFormProps {
  onBackToSignIn: () => void
}

export function ForgotPasswordForm({ onBackToSignIn }: ForgotPasswordFormProps) {
  const { t } = useLanguage()
  const { resetPasswordRequest } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await resetPasswordRequest(email)
      if (error) {
        toast.error(sanitizeErrorMessage(error.message))
      } else {
        setSent(true)
        toast.success(t('auth.forgotPassword.success'))
      }
    } catch (err) {
      toast.error(err instanceof Error ? sanitizeErrorMessage(err.message) : t('auth.error.generic'))
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-green-600">{t('auth.forgotPassword.success')}</p>
        <Button variant="outline" onClick={onBackToSignIn} className="w-full">
          {t('auth.forgotPassword.backToSignIn')}
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-600">{t('auth.forgotPassword.description')}</p>
      <div className="space-y-2">
        <Label htmlFor="forgot-email">{t('auth.email')}</Label>
        <Input
          id="forgot-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? t('common.loading') : t('auth.forgotPassword.submit')}
      </Button>
      <Button variant="ghost" onClick={onBackToSignIn} className="w-full">
        {t('auth.forgotPassword.backToSignIn')}
      </Button>
    </form>
  )
}
