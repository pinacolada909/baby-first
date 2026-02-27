import { useMemo } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTimeBlocks } from '@/hooks/useTimeBlocks'
import { useCaregivers } from '@/hooks/useCaregivers'
import { useStandingSessions } from '@/hooks/useStandingSessions'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, CheckCircle, BarChart3 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { TimeBlock, BabyCaregiver, StandingSession } from '@/types'

const COLORS = ['#a78bfa', '#34d399', '#fbbf24', '#f87171', '#60a5fa']

interface CareWorkloadCardProps {
  babyId: string | undefined
  isDemo: boolean
}

export function CareWorkloadCard({ babyId }: CareWorkloadCardProps) {
  const { t } = useLanguage()
  const { data: timeBlocks = [] } = useTimeBlocks(babyId)
  const { data: caregivers = [] } = useCaregivers(babyId)
  const { data: standingSessions = [] } = useStandingSessions(babyId)

  const now = Date.now()
  const twelveHoursAgo = now - 12 * 3600000

  // Compute per-caregiver hours in last 12h
  const workloadData = useMemo(() => {
    return caregivers.map((c: BabyCaregiver, i: number) => {
      const blocks = timeBlocks.filter(
        (b: TimeBlock) =>
          b.caregiver_id === c.user_id &&
          b.block_type === 'care' &&
          new Date(b.start_time).getTime() >= twelveHoursAgo,
      )
      const totalMs = blocks.reduce((sum: number, b: TimeBlock) => {
        const start = Math.max(new Date(b.start_time).getTime(), twelveHoursAgo)
        const end = Math.min(new Date(b.end_time).getTime(), now)
        return sum + Math.max(0, end - start)
      }, 0)
      const hours = Math.round((totalMs / 3600000) * 10) / 10
      return { name: c.display_name, hours, color: COLORS[i % COLORS.length] }
    })
  }, [caregivers, timeBlocks, twelveHoursAgo, now])

  // Standing time alert for current active session
  const activeStanding = useMemo(() => {
    return standingSessions.find((s: StandingSession) => !s.end_time) ?? null
  }, [standingSessions])

  const standingDurationMin = activeStanding
    ? Math.floor((now - new Date(activeStanding.start_time).getTime()) / 60000)
    : 0

  // Rest status: check if any caregiver has < 2h rest in last 12h
  const restStatus = useMemo(() => {
    return caregivers.map((c: BabyCaregiver) => {
      const restBlocks = timeBlocks.filter(
        (b: TimeBlock) =>
          b.caregiver_id === c.user_id &&
          b.block_type === 'rest' &&
          new Date(b.start_time).getTime() >= twelveHoursAgo,
      )
      const restMs = restBlocks.reduce((sum: number, b: TimeBlock) => {
        const start = Math.max(new Date(b.start_time).getTime(), twelveHoursAgo)
        const end = Math.min(new Date(b.end_time).getTime(), now)
        return sum + Math.max(0, end - start)
      }, 0)
      const restHours = restMs / 3600000
      return { name: c.display_name, restHours, isOk: restHours >= 2 }
    })
  }, [caregivers, timeBlocks, twelveHoursAgo, now])

  return (
    <Card className="border-slate-200 bg-white transition-all hover:shadow-md">
      <CardContent className="p-4 space-y-4">
        <h3 className="text-base font-bold">{t('dashboard.workload.12h')}</h3>

        {/* Bar chart */}
        {workloadData.length > 0 ? (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={workloadData} layout="vertical" margin={{ left: 0, right: 16 }}>
              <XAxis type="number" unit="h" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number | string | undefined) => [`${value ?? 0} ${t('dashboard.workload.hours')}`, '']}
              />
              <Bar
                dataKey="hours"
                radius={[0, 6, 6, 0]}
                barSize={20}
                animationDuration={800}
                animationBegin={100}
              >
                {workloadData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <BarChart3 className="size-5 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">
                {t('dashboard.workload.empty')}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {t('dashboard.workload.empty.hint')}
              </p>
            </div>
          </div>
        )}

        {/* Alerts */}
        <div className="space-y-2">
          {activeStanding && standingDurationMin > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 transition-all">
              <AlertTriangle className="size-4 text-amber-500 shrink-0" />
              <span className="text-sm text-amber-700">
                {t('dashboard.workload.standingAlert')}: {standingDurationMin} {t('dashboard.workload.min')}
              </span>
            </div>
          )}

          {restStatus.map((r) => (
            <div
              key={r.name}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-all ${
                r.isOk ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'
              }`}
            >
              {r.isOk ? (
                <CheckCircle className="size-4 text-green-500 shrink-0" />
              ) : (
                <AlertTriangle className="size-4 text-red-500 shrink-0" />
              )}
              <span className={`text-sm ${r.isOk ? 'text-green-700' : 'text-red-700'}`}>
                {r.name}: {r.isOk ? t('dashboard.workload.restOk') : t('dashboard.workload.restLow')}
              </span>
            </div>
          ))}

          {activeStanding && standingDurationMin >= 30 && (
            <div className="flex items-center gap-2 rounded-lg bg-purple-50 border border-purple-100 px-3 py-2 transition-all">
              <span className="text-sm text-purple-700">
                {t('dashboard.workload.recommend')} 15-20 {t('dashboard.workload.min')}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
