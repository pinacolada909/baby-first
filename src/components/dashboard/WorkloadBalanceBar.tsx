import { useLanguage } from '@/contexts/LanguageContext'
import type { CaregiverActivity } from '@/hooks/useActivityDashboard'

const BG_COLORS = [
  'bg-purple-500',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
]

interface WorkloadBalanceBarProps {
  activities: CaregiverActivity[]
  totalActivities: number
}

export function WorkloadBalanceBar({ activities, totalActivities }: WorkloadBalanceBarProps) {
  const { t } = useLanguage()

  if (totalActivities === 0) {
    return (
      <div className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
        {t('dashboard.workload.empty')}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">{t('dashboard.workload.title')}</h3>
      <div className="flex h-8 overflow-hidden rounded-full">
        {activities
          .filter((cg) => cg.total > 0)
          .map((cg, idx) => {
            const pct = Math.round((cg.total / totalActivities) * 100)
            return (
              <div
                key={cg.caregiverId}
                style={{ width: `${pct}%` }}
                className={`${BG_COLORS[idx % BG_COLORS.length]} flex items-center justify-center text-xs font-medium text-white transition-all`}
                title={`${cg.displayName}: ${pct}%`}
              >
                {pct >= 15 && `${cg.displayName} ${pct}%`}
              </div>
            )
          })}
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {activities
          .filter((cg) => cg.total > 0)
          .map((cg, idx) => (
            <div key={cg.caregiverId} className="flex items-center gap-1">
              <div className={`h-2.5 w-2.5 rounded-full ${BG_COLORS[idx % BG_COLORS.length]}`} />
              <span>
                {cg.displayName}: {Math.round((cg.total / totalActivities) * 100)}%
              </span>
            </div>
          ))}
      </div>
    </div>
  )
}
