import { useMemo } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useBaby } from '@/contexts/BabyContext'
import { useAuth } from '@/contexts/AuthContext'
import { useSleepSessions } from '@/hooks/useSleepSessions'
import { useFeedings } from '@/hooks/useFeedings'
import { useDiaperChanges } from '@/hooks/useDiaperChanges'
import { Utensils, Moon, Droplets } from 'lucide-react'

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

function formatDuration(dateStr: string): string {
  const now = new Date()
  const then = new Date(dateStr)
  const diffMs = now.getTime() - then.getTime()
  if (diffMs < 0) return '0m'
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 60) return `${diffMin}m`
  const hours = Math.floor(diffMin / 60)
  const mins = diffMin % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

const CIRCUMFERENCE = 2 * Math.PI * 34 // ≈ 213.6

export function BabyStatusCard() {
  const { t } = useLanguage()
  const { selectedBaby } = useBaby()
  const { user } = useAuth()
  const babyId = user ? selectedBaby?.id : undefined

  const { data: sleepSessions = [] } = useSleepSessions(babyId)
  const { data: feedings = [] } = useFeedings(babyId)
  const { data: diaperChanges = [] } = useDiaperChanges(babyId)

  const lastSleep = sleepSessions[0] ?? null
  const lastFeeding = feedings[0] ?? null
  const lastDiaper = diaperChanges[0] ?? null

  const isSleeping = useMemo(() => {
    if (!lastSleep) return false
    if (!lastSleep.end_time) return true
    return new Date(lastSleep.end_time).getTime() > Date.now()
  }, [lastSleep])

  // Derived status
  const status = useMemo(() => {
    if (isSleeping) return { color: 'bg-purple-400', label: t('home.status.currentlySleeping') }
    const now = Date.now()
    const threeHoursMs = 3 * 60 * 60 * 1000
    if (lastFeeding && now - new Date(lastFeeding.fed_at).getTime() > threeHoursMs) {
      return { color: 'bg-yellow-400', label: t('home.status.mayNeedAttention') }
    }
    if (lastDiaper && now - new Date(lastDiaper.changed_at).getTime() > threeHoursMs) {
      return { color: 'bg-yellow-400', label: t('home.status.mayNeedAttention') }
    }
    return { color: 'bg-green-400', label: t('home.status.currentlyContent') }
  }, [isSleeping, lastFeeding, lastDiaper, t])

  const ago = t('home.status.ago')

  // Awake duration text
  const awakeText = useMemo(() => {
    if (isSleeping) return t('home.status.sleeping')
    if (!lastSleep?.end_time) return t('home.status.noData')
    return formatDuration(lastSleep.end_time)
  }, [isSleeping, lastSleep, t])

  // Diaper text
  const diaperText = useMemo(() => {
    if (!lastDiaper) return t('home.status.noData')
    return `${formatTimeAgo(lastDiaper.changed_at, ago)} (${t(`diaper.status.${lastDiaper.status}` as const)})`
  }, [lastDiaper, t, ago])

  // Daily goal composite score
  const dailyGoal = useMemo(() => {
    const todaySleep = sleepSessions.filter((s) => isToday(s.start_time))
    const totalSleepHours = todaySleep.reduce((sum, s) => sum + (s.duration_hours ?? 0), 0)
    const todayFeedings = feedings.filter((f) => isToday(f.fed_at))
    const todayDiapers = diaperChanges.filter((d) => isToday(d.changed_at))

    const sleepPct = Math.min(totalSleepHours / 14, 1)
    const feedingPct = Math.min(todayFeedings.length / 8, 1)
    const diaperPct = Math.min(todayDiapers.length / 6, 1)

    return Math.round(((sleepPct + feedingPct + diaperPct) / 3) * 100)
  }, [sleepSessions, feedings, diaperChanges])

  const dashOffset = CIRCUMFERENCE * (1 - dailyGoal / 100)

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 to-[#8B5CF6] p-6 text-white shadow-xl shadow-[#8B5CF6]/20">
      {/* Decorative blur */}
      <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-white/10 blur-3xl" />

      <div className="relative z-10 flex items-end justify-between">
        {/* Left: status + stats */}
        <div className="space-y-4">
          {/* Status pill */}
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 backdrop-blur-md">
            <span className={`h-2 w-2 rounded-full ${status.color} animate-pulse`} />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {status.label}
            </span>
          </div>

          {/* Quick stats */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Utensils className="h-4 w-4 text-indigo-200" />
              <p className="text-sm font-medium">
                {t('home.status.lastFeedShort')}:{' '}
                <span className="font-bold">
                  {lastFeeding ? formatTimeAgo(lastFeeding.fed_at, ago) : t('home.status.noData')}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Moon className="h-4 w-4 text-indigo-200" />
              <p className="text-sm font-medium">
                {t('home.status.awakeFor')}:{' '}
                <span className="font-bold">{awakeText}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Droplets className="h-4 w-4 text-indigo-200" />
              <p className="text-sm font-medium">
                {t('home.status.diaperShort')}:{' '}
                <span className="font-bold">{diaperText}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Right: daily goal ring */}
        <div className="flex flex-col items-center">
          <div className="relative h-20 w-20">
            <svg className="h-full w-full -rotate-90">
              <circle
                cx="40" cy="40" r="34"
                fill="transparent"
                stroke="currentColor"
                strokeWidth="6"
                className="text-white/20"
              />
              <circle
                cx="40" cy="40" r="34"
                fill="transparent"
                stroke="currentColor"
                strokeWidth="6"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                className="text-white transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold">{dailyGoal}%</span>
            </div>
          </div>
          <span className="mt-2 text-[10px] font-medium uppercase opacity-80">
            {t('home.status.dailyGoal')}
          </span>
        </div>
      </div>
    </section>
  )
}
