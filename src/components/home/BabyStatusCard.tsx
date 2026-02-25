import { useMemo } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useBaby } from '@/contexts/BabyContext'
import { useAuth } from '@/contexts/AuthContext'
import { useSleepSessions } from '@/hooks/useSleepSessions'
import { useFeedings } from '@/hooks/useFeedings'
import { useDiaperChanges } from '@/hooks/useDiaperChanges'
import { Card, CardContent } from '@/components/ui/card'

function formatTimeAgo(dateStr: string, agoSuffix: string): string {
  const now = new Date()
  const then = new Date(dateStr)
  const diffMs = now.getTime() - then.getTime()
  if (diffMs < 0) return ''
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return `<1m ${agoSuffix}`
  if (diffMin < 60) return `${diffMin}m ${agoSuffix}`
  const hours = Math.floor(diffMin / 60)
  const mins = diffMin % 60
  if (hours < 24) {
    return mins > 0 ? `${hours}h ${mins}m ${agoSuffix}` : `${hours}h ${agoSuffix}`
  }
  const days = Math.floor(hours / 24)
  return `${days}d ${agoSuffix}`
}

function getDayAge(birthDate: string | null): number | null {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  const now = new Date()
  const diffMs = now.getTime() - birth.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1
}

export function BabyStatusCard() {
  const { t } = useLanguage()
  const { selectedBaby } = useBaby()
  const { user } = useAuth()
  const babyId = user ? selectedBaby?.id : undefined

  const { data: sleepSessions = [] } = useSleepSessions(babyId)
  const { data: feedings = [] } = useFeedings(babyId)
  const { data: diaperChanges = [] } = useDiaperChanges(babyId)

  const dayAge = getDayAge(selectedBaby?.birth_date ?? null)

  // Most recent records (already sorted desc by hooks)
  const lastSleep = sleepSessions[0] ?? null
  const lastFeeding = feedings[0] ?? null
  const lastDiaper = diaperChanges[0] ?? null

  // Is baby currently sleeping? (most recent sleep has no end_time or end_time is in the future)
  const isSleeping = useMemo(() => {
    if (!lastSleep) return false
    if (!lastSleep.end_time) return true
    return new Date(lastSleep.end_time).getTime() > Date.now()
  }, [lastSleep])

  // Derived status
  const status = useMemo(() => {
    if (isSleeping) return { emoji: '🟣', label: t('home.status.sleeping') }
    const now = Date.now()
    const threeHoursMs = 3 * 60 * 60 * 1000
    if (lastFeeding && now - new Date(lastFeeding.fed_at).getTime() > threeHoursMs) {
      return { emoji: '🟡', label: t('home.status.needFeeding') }
    }
    if (lastDiaper && now - new Date(lastDiaper.changed_at).getTime() > threeHoursMs) {
      return { emoji: '🟡', label: t('home.status.needChanging') }
    }
    return { emoji: '🟢', label: t('home.status.content') }
  }, [isSleeping, lastFeeding, lastDiaper, t])

  const ago = t('home.status.ago')

  // Awake duration
  const awakeText = useMemo(() => {
    if (isSleeping) return t('home.status.sleeping')
    if (!lastSleep?.end_time) return t('home.status.noData')
    return formatTimeAgo(lastSleep.end_time, ago)
  }, [isSleeping, lastSleep, t, ago])

  // Diaper status text
  const diaperText = useMemo(() => {
    if (!lastDiaper) return t('home.status.noData')
    const statusMap: Record<string, string> = {
      wet: t('diaper.status.wet'),
      dirty: t('diaper.status.dirty'),
      mixed: t('diaper.status.mixed'),
      dry: t('diaper.status.dry'),
    }
    const label = statusMap[lastDiaper.status] ?? lastDiaper.status
    return `${label} · ${formatTimeAgo(lastDiaper.changed_at, ago)}`
  }, [lastDiaper, t, ago])

  const diaperIsNormal = !lastDiaper || lastDiaper.status === 'wet' || lastDiaper.status === 'dry'

  return (
    <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
      <CardContent className="p-5">
        <div className="mb-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold">👶 {selectedBaby?.name ?? 'Baby'}</span>
        </div>

        {dayAge !== null && (
          <p className="mb-2 text-sm text-muted-foreground">
            Age: Day {dayAge}
          </p>
        )}

        <p className="mb-4 text-sm font-medium">
          {status.emoji} {status.label}
        </p>

        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('home.status.lastFeed')}:</span>
            <span className="font-medium">
              {lastFeeding ? formatTimeAgo(lastFeeding.fed_at, ago) : t('home.status.noData')}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('home.status.awake')}:</span>
            <span className="font-medium">{awakeText}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('home.status.diaper')}:</span>
            <span className="font-medium">
              {diaperIsNormal ? '✅' : '⚠️'} {diaperText}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
