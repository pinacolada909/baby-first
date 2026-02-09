import { useState } from 'react'
import type { FormEvent } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface SignInFormProps {
  onSuccess: () => void
  onForgotPassword: () => void
}

export function SignInForm({ onSuccess, onForgotPassword }: SignInFormProps) {
  const { t } = useLanguage()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await signIn(email, password)
      if (error) {
        toast.error(t('auth.error.invalid'))
      } else {
        toast.success(t('auth.signIn.success'))
        onSuccess()
      }
    } catch {
      toast.error(t('auth.error.generic'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signin-email">{t('auth.email')}</Label>
        <Input
          id="signin-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="signin-password">{t('auth.password')}</Label>
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-sm text-purple-600 hover:text-purple-700 hover:underline"
          >
            {t('auth.forgotPassword')}
          </button>
        </div>
        <Input
          id="signin-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? t('common.loading') : t('auth.signIn')}
      </Button>
    </form>
  )
}
