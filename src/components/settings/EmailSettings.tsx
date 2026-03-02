import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { useEmailPreferences, useUpdateEmailPreferences } from '@/hooks/useEmailPreferences'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Mail } from 'lucide-react'
import { toast } from 'sonner'

const TIMEZONE_OPTIONS = [
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central Europe (CET)' },
  { value: 'Asia/Shanghai', label: 'China Standard Time (CST)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern (AEST)' },
]

export function EmailSettings() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const { data: preferences, isLoading } = useEmailPreferences()
  const updateMutation = useUpdateEmailPreferences()

  const handleToggle = async (enabled: boolean) => {
    try {
      await updateMutation.mutateAsync({ enabled })
      toast.success(enabled ? t('email.enabled') : t('email.disabled'))
    } catch {
      toast.error(t('common.error'))
    }
  }

  const handleTimezoneChange = async (timezone: string) => {
    try {
      await updateMutation.mutateAsync({ timezone })
    } catch {
      toast.error(t('common.error'))
    }
  }

  if (!user) return null

  const currentTz = preferences?.timezone || 'America/Los_Angeles'
  const currentTzLabel = TIMEZONE_OPTIONS.find(o => o.value === currentTz)?.label || currentTz

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

          {preferences?.daily_summary_enabled && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>{t('email.timezone')}</Label>
                <Select
                  value={currentTz}
                  onValueChange={handleTimezoneChange}
                  disabled={updateMutation.isPending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>{currentTzLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground space-y-1">
                <p>{t('email.sendTime')}</p>
                <p>{t('email.sendTo')}: <span className="font-medium text-foreground">{user.email}</span></p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
