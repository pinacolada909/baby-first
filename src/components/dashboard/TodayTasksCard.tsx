import { useState, useMemo } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useSleepSessions } from '@/hooks/useSleepSessions'
import { useFeedings } from '@/hooks/useFeedings'
import { useDiaperChanges } from '@/hooks/useDiaperChanges'
import { useCareTasks } from '@/hooks/useCareTasks'
import { useCaregivers } from '@/hooks/useCaregivers'
import { Card, CardContent } from '@/components/ui/card'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { ChevronDown, Moon, Utensils, Baby, ClipboardCheck, ListChecks } from 'lucide-react'
import type { BabyCaregiver } from '@/types'

function isToday(dateStr: string): boolean {
  return new Date(dateStr).toDateString() === new Date().toDateString()
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

type EntryType = 'sleep' | 'feeding' | 'diaper' | 'task'

interface TimelineEntry {
  time: string
  timestamp: number
  caregiver: string
  action: string
  type: EntryType
}

const TIMELINE_CONFIG: Record<EntryType, { bg: string; text: string; Icon: React.ComponentType<{ className?: string }> }> = {
  sleep:   { bg: 'bg-indigo-100', text: 'text-indigo-500', Icon: Moon },
  feeding: { bg: 'bg-rose-100',   text: 'text-rose-500',   Icon: Utensils },
  diaper:  { bg: 'bg-emerald-100', text: 'text-emerald-500', Icon: Baby },
  task:    { bg: 'bg-amber-100',  text: 'text-amber-500',  Icon: ClipboardCheck },
}

interface TodayTasksCardProps {
  babyId: string | undefined
  isDemo: boolean
}

export function TodayTasksCard({ babyId, isDemo }: TodayTasksCardProps) {
  const { t } = useLanguage()
  const [expanded, setExpanded] = useState(true)

  const { data: sleepSessions = [] } = useSleepSessions(babyId)
  const { data: feedings = [] } = useFeedings(babyId)
  const { data: diaperChanges = [] } = useDiaperChanges(babyId)
  const { data: careTasks = [] } = useCareTasks(babyId)
  const { data: caregivers = [] } = useCaregivers(babyId)

  const getName = (id: string) =>
    caregivers.find((c: BabyCaregiver) => c.user_id === id)?.display_name ?? '?'

  const timeline: TimelineEntry[] = useMemo(() => {
    const entries: TimelineEntry[] = []

    sleepSessions
      .filter((s) => isToday(s.start_time))
      .forEach((s) => {
        entries.push({
          time: formatTime(s.start_time),
          timestamp: new Date(s.start_time).getTime(),
          caregiver: getName(s.caregiver_id),
          action: t('nav.sleepTracker'),
          type: 'sleep',
        })
      })

    feedings
      .filter((f) => isToday(f.fed_at))
      .forEach((f) => {
        const typeLabel = t(`feeding.types.${f.feeding_type}` as keyof typeof t)
        const detail = f.volume_ml ? ` (${f.volume_ml}ml)` : ''
        entries.push({
          time: formatTime(f.fed_at),
          timestamp: new Date(f.fed_at).getTime(),
          caregiver: getName(f.caregiver_id),
          action: `${typeLabel}${detail}`,
          type: 'feeding',
        })
      })

    diaperChanges
      .filter((d) => isToday(d.changed_at))
      .forEach((d) => {
        entries.push({
          time: formatTime(d.changed_at),
          timestamp: new Date(d.changed_at).getTime(),
          caregiver: getName(d.caregiver_id),
          action: `${t('nav.diaperTracker')} (${d.status})`,
          type: 'diaper',
        })
      })

    careTasks
      .filter((ct) => ct.completed && ct.completed_at && isToday(ct.completed_at))
      .forEach((ct) => {
        entries.push({
          time: formatTime(ct.completed_at!),
          timestamp: new Date(ct.completed_at!).getTime(),
          caregiver: getName(ct.caregiver_id),
          action: t(`dashboard.task.${ct.task_type}` as keyof typeof t),
          type: 'task',
        })
      })

    return entries.sort((a, b) => b.timestamp - a.timestamp)
  }, [sleepSessions, feedings, diaperChanges, careTasks, caregivers, t])

  return (
    <Card className="border-slate-200 bg-white transition-all hover:shadow-md">
      <CardContent className="p-4 space-y-3">
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleTrigger asChild>
            <button
              className="flex w-full items-center justify-between"
              aria-expanded={expanded}
            >
              <h3 className="text-base font-bold">{t('dashboard.todayTasks.title')}</h3>
              <ChevronDown
                className={`size-5 text-slate-400 transition-transform duration-200 ${expanded ? '' : '-rotate-90'}`}
              />
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
            <div className="pt-3">
              {timeline.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                    <ListChecks className="size-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      {t('dashboard.todayTasks.empty')}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {t('dashboard.todayTasks.empty.hint')}
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  {timeline.map((entry, i) => {
                    const config = TIMELINE_CONFIG[entry.type]
                    const Icon = config.Icon
                    return (
                      <div key={i} className="flex gap-3">
                        {/* Timeline track */}
                        <div className="flex flex-col items-center">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config.bg}`}>
                            <Icon className={`size-4 ${config.text}`} />
                          </div>
                          {i < timeline.length - 1 && (
                            <div className="w-px flex-1 bg-slate-200" />
                          )}
                        </div>
                        {/* Content */}
                        <div className="pb-4 pt-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <time className="text-xs font-mono text-slate-400 shrink-0">
                              {entry.time}
                            </time>
                            <span className="text-sm font-medium text-slate-700 truncate">
                              {entry.caregiver}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 truncate">{entry.action}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}
