import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '@/contexts/LanguageContext'
import { useSleepSessions } from '@/hooks/useSleepSessions'
import { useFeedings } from '@/hooks/useFeedings'
import { useDiaperChanges } from '@/hooks/useDiaperChanges'
import { useGrowthRecords } from '@/hooks/useGrowthRecords'
import { Card, CardContent } from '@/components/ui/card'
import { Moon, Utensils, Baby, Ruler } from 'lucide-react'

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

interface TrackerSummaryCardsProps {
  babyId: string
}

export function TrackerSummaryCards({ babyId }: TrackerSummaryCardsProps) {
  const { t } = useLanguage()
  const navigate = useNavigate()

  const { data: sleepSessions = [] } = useSleepSessions(babyId)
  const { data: feedings = [] } = useFeedings(babyId)
  const { data: diaperChanges = [] } = useDiaperChanges(babyId)
  const { data: growthRecords = [] } = useGrowthRecords(babyId)

  // Sleep: today's sessions
  const sleepStats = useMemo(() => {
    const todaySessions = sleepSessions.filter((s) => isToday(s.start_time))
    const totalHours = todaySessions.reduce((sum, s) => sum + (s.duration_hours ?? 0), 0)
    return { count: todaySessions.length, totalHours: Math.round(totalHours * 10) / 10 }
  }, [sleepSessions])

  // Feeding: today's feedings
  const feedingStats = useMemo(() => {
    const todayFeedings = feedings.filter((f) => isToday(f.fed_at))
    const totalMl = todayFeedings.reduce((sum, f) => sum + (f.volume_ml ?? 0), 0)
    return { count: todayFeedings.length, totalMl }
  }, [feedings])

  // Diaper: today's changes
  const diaperStats = useMemo(() => {
    const todayChanges = diaperChanges.filter((d) => isToday(d.changed_at))
    const wet = todayChanges.filter((d) => d.status === 'wet').length
    const dirty = todayChanges.filter((d) => d.status === 'dirty').length
    const mixed = todayChanges.filter((d) => d.status === 'mixed').length
    return { count: todayChanges.length, wet, dirty, mixed }
  }, [diaperChanges])

  // Growth: latest record (not filtered to today)
  const latestGrowth = growthRecords[0] ?? null

  const cards = [
    {
      icon: Moon,
      title: t('home.summary.sleep'),
      route: '/sleep-tracker',
      iconColor: 'text-blue-500',
      iconBg: 'bg-blue-100',
      borderColor: 'border-blue-200',
      hoverBg: 'hover:bg-blue-50/50',
      content: sleepStats.count > 0
        ? `${sleepStats.totalHours} ${t('home.summary.hrs')} · ${sleepStats.count} ${t('home.summary.sessions')}`
        : t('home.summary.noData'),
    },
    {
      icon: Utensils,
      title: t('home.summary.feeding'),
      route: '/feeding-tracker',
      iconColor: 'text-rose-500',
      iconBg: 'bg-rose-100',
      borderColor: 'border-rose-200',
      hoverBg: 'hover:bg-rose-50/50',
      content: feedingStats.count > 0
        ? `${feedingStats.count} ${t('home.summary.feedings')}${feedingStats.totalMl > 0 ? ` · ${feedingStats.totalMl} ml` : ''}`
        : t('home.summary.noData'),
    },
    {
      icon: Baby,
      title: t('home.summary.diaper'),
      route: '/diaper-tracker',
      iconColor: 'text-green-500',
      iconBg: 'bg-green-100',
      borderColor: 'border-green-200',
      hoverBg: 'hover:bg-green-50/50',
      content: diaperStats.count > 0
        ? `${diaperStats.count} ${t('home.summary.changes')}` +
          (diaperStats.wet > 0 ? ` · ${diaperStats.wet} ${t('home.summary.wet')}` : '') +
          (diaperStats.dirty > 0 ? ` · ${diaperStats.dirty} ${t('home.summary.dirty')}` : '') +
          (diaperStats.mixed > 0 ? ` · ${diaperStats.mixed} ${t('home.summary.mixed')}` : '')
        : t('home.summary.noData'),
    },
    {
      icon: Ruler,
      title: t('home.summary.growth'),
      route: '/growth',
      iconColor: 'text-teal-500',
      iconBg: 'bg-teal-100',
      borderColor: 'border-teal-200',
      hoverBg: 'hover:bg-teal-50/50',
      content: latestGrowth
        ? [
            latestGrowth.weight_kg != null ? `${latestGrowth.weight_kg} kg` : null,
            latestGrowth.height_cm != null ? `${latestGrowth.height_cm} cm` : null,
            latestGrowth.head_cm != null ? `${t('growth.head')}: ${latestGrowth.head_cm} cm` : null,
          ].filter(Boolean).join(' · ') || t('home.summary.noRecords')
        : t('home.summary.noRecords'),
    },
  ]

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card
            key={card.route}
            className={`cursor-pointer border-2 ${card.borderColor} bg-white transition-all ${card.hoverBg} hover:shadow-md`}
            onClick={() => navigate(card.route)}
          >
            <CardContent className="p-5">
              <div className="mb-2 flex items-center gap-2">
                <div className={`inline-flex rounded-xl p-2 ${card.iconBg}`}>
                  <Icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
                <h3 className="font-semibold">{card.title}</h3>
                <span className="ml-auto text-xs text-muted-foreground">{t('home.summary.today')}</span>
              </div>
              <p className="text-sm text-muted-foreground">{card.content}</p>
            </CardContent>
          </Card>
        )
      })}
    </section>
  )
}
