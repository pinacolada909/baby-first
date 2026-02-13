import { useLanguage } from '@/contexts/LanguageContext'
import { Card, CardContent } from '@/components/ui/card'
import type { CaregiverActivity } from '@/hooks/useActivityDashboard'

const COLORS = [
  'border-l-purple-500',
  'border-l-blue-500',
  'border-l-emerald-500',
  'border-l-amber-500',
  'border-l-rose-500',
  'border-l-cyan-500',
]

interface WorkloadSummaryCardsProps {
  activities: CaregiverActivity[]
}

export function WorkloadSummaryCards({ activities }: WorkloadSummaryCardsProps) {
  const { t } = useLanguage()

  if (activities.length === 0) return null

  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
      {activities.map((cg, idx) => (
        <Card key={cg.caregiverId} className={`border-l-4 ${COLORS[idx % COLORS.length]}`}>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-muted-foreground">{cg.displayName}</p>
            <p className="text-2xl font-bold">{cg.total}</p>
            <p className="text-xs text-muted-foreground">{t('dashboard.activity.total')}</p>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {cg.feedings > 0 && <span>{cg.feedings} {t('dashboard.activity.feedings')}</span>}
              {cg.diapers > 0 && <span>{cg.diapers} {t('dashboard.activity.diapers')}</span>}
              {cg.sleepPutdowns > 0 && <span>{cg.sleepPutdowns} {t('dashboard.activity.sleepPutdowns')}</span>}
              {cg.householdTasks > 0 && <span>{cg.householdTasks} {t('dashboard.activity.tasks')}</span>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
