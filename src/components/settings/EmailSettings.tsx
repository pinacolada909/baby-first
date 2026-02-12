import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { useEmailPreferences, useUpdateEmailPreferences } from '@/hooks/useEmailPreferences'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Mail } from 'lucide-react'
import { toast } from 'sonner'

export function EmailSettings() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const { data: preferences, isLoading } = useEmailPreferences()
  const updateMutation = useUpdateEmailPreferences()

  const handleToggle = async (enabled: boolean) => {
    try {
      await updateMutation.mutateAsync(enabled)
      toast.success(enabled ? t('email.enabled') : t('email.disabled'))
    } catch {
      toast.error(t('common.error'))
    }
  }

  if (!user) return null

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Mail className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">{t('email.title')}</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="daily-summary">{t('email.dailySummary')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('email.dailySummaryDesc')}
              </p>
            </div>
            <Switch
              id="daily-summary"
              checked={preferences?.daily_summary_enabled ?? false}
              onCheckedChange={handleToggle}
              disabled={isLoading || updateMutation.isPending}
            />
          </div>

          <div className="text-sm text-muted-foreground">
            <p>{t('email.sendTo')}: <span className="font-medium">{user.email}</span></p>
            <p>{t('email.sendTime')}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
