import { useState } from 'react'
import type { FormEvent } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

export function UpdatePasswordModal() {
  const { t } = useLanguage()
  const { isPasswordRecovery, updatePassword, clearPasswordRecovery } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast.error(t('auth.updatePassword.mismatch'))
      return
    }
    if (password.length < 6) {
      toast.error(t('auth.updatePassword.tooShort'))
      return
    }
    setLoading(true)
    try {
      const { error } = await updatePassword(password)
      if (error) {
        toast.error(error.message)
      } else {
        toast.success(t('auth.updatePassword.success'))
        setPassword('')
        setConfirmPassword('')
      }
    } catch {
      toast.error(t('auth.error.generic'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isPasswordRecovery} onOpenChange={(open) => !open && clearPasswordRecovery()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('auth.updatePassword.title')}</DialogTitle>
          <DialogDescription>{t('auth.updatePassword.description')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">{t('auth.updatePassword.new')}</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">{t('auth.updatePassword.confirm')}</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t('common.loading') : t('auth.updatePassword.submit')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
