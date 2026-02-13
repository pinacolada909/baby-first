import { useLanguage } from '@/contexts/LanguageContext'
import { Card, CardContent } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { CaregiverActivity } from '@/hooks/useActivityDashboard'

interface ActivityBreakdownChartProps {
  activities: CaregiverActivity[]
}

export function ActivityBreakdownChart({ activities }: ActivityBreakdownChartProps) {
  const { t } = useLanguage()

  const hasData = activities.some((a) => a.total > 0)

  if (!hasData) return null

  const data = activities.map((cg) => ({
    name: cg.displayName,
    [t('dashboard.activity.feedings')]: cg.feedings,
    [t('dashboard.activity.diapers')]: cg.diapers,
    [t('dashboard.activity.sleepPutdowns')]: cg.sleepPutdowns,
    [t('dashboard.activity.tasks')]: cg.householdTasks,
  }))

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="mb-4 text-sm font-medium">{t('dashboard.activity.title')}</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data}>
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey={t('dashboard.activity.feedings')} fill="#f59e0b" radius={[2, 2, 0, 0]} />
            <Bar dataKey={t('dashboard.activity.diapers')} fill="#10b981" radius={[2, 2, 0, 0]} />
            <Bar dataKey={t('dashboard.activity.sleepPutdowns')} fill="#6366f1" radius={[2, 2, 0, 0]} />
            <Bar dataKey={t('dashboard.activity.tasks')} fill="#a855f7" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
