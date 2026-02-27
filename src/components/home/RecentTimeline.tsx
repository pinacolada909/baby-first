import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '@/contexts/LanguageContext'
import { useSleepSessions } from '@/hooks/useSleepSessions'
import { useFeedings } from '@/hooks/useFeedings'
import { useDiaperChanges } from '@/hooks/useDiaperChanges'
import { usePumpingSessions } from '@/hooks/usePumpingSessions'
import { Moon, Sun, Utensils, Baby, Droplets } from 'lucide-react'

interface TimelineEvent {
  type: 'sleep' | 'feeding' | 'diaper' | 'pumping'
  time: string
  label: string
  detail: string
}

function formatTimestamp(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatSleepDuration(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h === 0) return `${m}m`
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

interface RecentTimelineProps {
  babyId: string
}

export function RecentTimeline({ babyId }: RecentTimelineProps) {
  const { t } = useLanguage()
  const navigate = useNavigate()

  const { data: sleepSessions = [] } = useSleepSessions(babyId)
  const { data: feedings = [] } = useFeedings(babyId)
  const { data: diaperChanges = [] } = useDiaperChanges(babyId)
  const { data: pumpingSessions = [] } = usePumpingSessions(babyId)

  const events = useMemo(() => {
    const items: TimelineEvent[] = []

    // Sleep events (wake-ups and fell-asleep)
    for (const s of sleepSessions.slice(0, 10)) {
      if (s.end_time) {
        items.push({
          type: 'sleep',
          time: s.end_time,
          label: t('home.timeline.wokeUp'),
          detail: `${t('home.timeline.sleptFor')} ${formatSleepDuration(s.duration_hours ?? 0)}`,
        })
      }
      items.push({
        type: 'sleep',
        time: s.start_time,
        label: t('home.timeline.fellAsleep'),
        detail: '',
      })
    }

    // Feeding events
    for (const f of feedings.slice(0, 10)) {
      const typeLabel =
        f.feeding_type === 'breastmilk'
          ? t('home.timeline.breastFeeding')
          : f.feeding_type === 'formula'
            ? t('home.timeline.bottleFeeding')
            : t('home.timeline.feeding')
      const detail = f.volume_ml ? `${f.volume_ml}ml • ${typeLabel}` : typeLabel
      items.push({
        type: 'feeding',
        time: f.fed_at,
        label: t('home.timeline.feeding'),
        detail,
      })
    }

    // Diaper events
    for (const d of diaperChanges.slice(0, 10)) {
      items.push({
        type: 'diaper',
        time: d.changed_at,
        label: t('home.timeline.diaperChange'),
        detail: t(`diaper.status.${d.status}` as const),
      })
    }

    // Pumping events
    for (const p of pumpingSessions.slice(0, 10)) {
      const sideLabel = t(`pumping.side.${p.side}` as const)
      items.push({
        type: 'pumping',
        time: p.pumped_at,
        label: t('home.timeline.pumped'),
        detail: `${p.volume_ml}ml • ${sideLabel}`,
      })
    }

    // Sort by time descending, take top 6
    items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    return items.slice(0, 6)
  }, [sleepSessions, feedings, diaperChanges, pumpingSessions, t])

  if (events.length === 0) return null

  const iconConfig: Record<string, { bg: string; color: string; Icon: typeof Moon }> = {
    sleep: { bg: 'bg-indigo-100', color: 'text-indigo-500', Icon: Moon },
    feeding: { bg: 'bg-rose-100', color: 'text-rose-500', Icon: Utensils },
    diaper: { bg: 'bg-emerald-100', color: 'text-emerald-500', Icon: Baby },
    pumping: { bg: 'bg-fuchsia-100', color: 'text-fuchsia-500', Icon: Droplets },
  }

  // Use Sun icon for wake-up events
  const getIcon = (event: TimelineEvent) => {
    if (event.type === 'sleep' && event.label === t('home.timeline.wokeUp')) {
      return { bg: 'bg-indigo-100', color: 'text-indigo-500', Icon: Sun }
    }
    return iconConfig[event.type]
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">{t('home.timeline.title')}</h3>
        <button
          className="text-xs font-bold text-[#8B5CF6]"
          onClick={() => navigate('/sleep-tracker')}
        >
          {t('home.timeline.seeAll')}
        </button>
      </div>
      <div className="space-y-3">
        {events.map((event, idx) => {
          const { bg, color, Icon } = getIcon(event)
          return (
            <div
              key={`${event.type}-${event.time}-${idx}`}
              className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${bg} ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h5 className="text-sm font-bold">{event.label}</h5>
                {event.detail && (
                  <p className="text-xs text-slate-500">{event.detail}</p>
                )}
              </div>
              <span className="text-xs font-medium text-slate-400">
                {formatTimestamp(event.time)}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
