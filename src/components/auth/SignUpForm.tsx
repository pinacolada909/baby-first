import { useState } from 'react'
import type { FormEvent } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface SignUpFormProps {
  onSuccess: () => void
}

export function SignUpForm({ onSuccess }: SignUpFormProps) {
  const { t } = useLanguage()
  const { signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await signUp(email, password, displayName)
      if (error) {
        toast.error(t('auth.error.generic'))
      } else {
        toast.success(t('auth.signUp.success'))
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
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? t('common.loading') : t('auth.signUp')}
      </Button>
    </form>
  )
}
