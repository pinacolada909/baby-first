import { useMemo } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { useBaby } from '@/contexts/BabyContext'
import { useSleepSessions } from '@/hooks/useSleepSessions'
import { useFeedings } from '@/hooks/useFeedings'
import { useTimeBlocks, useAddTimeBlock, useUpdateTimeBlock } from '@/hooks/useTimeBlocks'
import { useCaregivers } from '@/hooks/useCaregivers'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Baby, Shield, Lock, ChevronRight, AlertTriangle, Users, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { TimeBlock, BabyCaregiver } from '@/types'

function formatDuration(ms: number): string {
  const totalMin = Math.floor(ms / 60000)
  if (totalMin < 60) return `${totalMin} min`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function isToday(dateStr: string): boolean {
  return new Date(dateStr).toDateString() === new Date().toDateString()
}

interface FamilyStatusCardProps {
  babyId: string | undefined
  isDemo: boolean
}

export function FamilyStatusCard({ babyId, isDemo }: FamilyStatusCardProps) {
  const { t } = useLanguage()
  const { user } = useAuth()
  const { selectedBaby } = useBaby()

  const { data: sleepSessions = [] } = useSleepSessions(babyId)
  const { data: feedings = [] } = useFeedings(babyId)
  const { data: timeBlocks = [] } = useTimeBlocks(babyId)
  const { data: caregivers = [] } = useCaregivers(babyId)
  const addBlock = useAddTimeBlock()
  const updateBlock = useUpdateTimeBlock()

  const now = Date.now()
  const isHandingOff = addBlock.isPending || updateBlock.isPending

  // Baby sleeping status
  const sleepInfo = useMemo(() => {
    const lastSleep = sleepSessions[0]
    if (!lastSleep) return { isSleeping: false, duration: 0 }
    const endTime = lastSleep.end_time ? new Date(lastSleep.end_time).getTime() : Infinity
    const isSleeping = endTime > now
    const duration = isSleeping ? now - new Date(lastSleep.start_time).getTime() : 0
    return { isSleeping, duration }
  }, [sleepSessions, now])

  // Next feeding estimate
  const nextFeedEstimate = useMemo(() => {
    const todayFeedings = feedings.filter((f) => isToday(f.fed_at))
    if (todayFeedings.length < 2) return null
    const times = todayFeedings.map((f) => new Date(f.fed_at).getTime()).sort((a, b) => a - b)
    let totalGap = 0
    for (let i = 1; i < times.length; i++) totalGap += times[i] - times[i - 1]
    const avgGap = totalGap / (times.length - 1)
    const lastFeedTime = times[times.length - 1]
    const nextFeedTime = lastFeedTime + avgGap
    const remaining = nextFeedTime - now
    return remaining > 0 ? remaining : null
  }, [feedings, now])

  // Current on-duty caregiver
  const currentShift = useMemo(() => {
    return timeBlocks.find(
      (b: TimeBlock) =>
        b.block_type === 'care' &&
        new Date(b.start_time).getTime() <= now &&
        new Date(b.end_time).getTime() >= now,
    ) ?? null
  }, [timeBlocks, now])

  const caregiverName = (id: string) =>
    caregivers.find((c: BabyCaregiver) => c.user_id === id)?.display_name ?? '?'

  const onDutyName = currentShift ? caregiverName(currentShift.caregiver_id) : null
  const onDutyDuration = currentShift ? now - new Date(currentShift.start_time).getTime() : 0

  // Resting caregivers
  const restingCaregivers = useMemo(() => {
    return caregivers
      .filter((c: BabyCaregiver) => !currentShift || c.user_id !== currentShift.caregiver_id)
      .map((c: BabyCaregiver) => {
        const restBlock = timeBlocks.find(
          (b: TimeBlock) =>
            b.caregiver_id === c.user_id &&
            b.block_type === 'rest' &&
            new Date(b.start_time).getTime() <= now &&
            new Date(b.end_time).getTime() >= now,
        )
        const restDuration = restBlock ? now - new Date(restBlock.start_time).getTime() : 0
        return { ...c, isResting: !!restBlock, restDuration }
      })
  }, [caregivers, timeBlocks, currentShift, now])

  // Mom recovery status
  const recoveringId = selectedBaby?.recovering_caregiver_id
  const momRecoveryStatus = useMemo(() => {
    if (!recoveringId) return null
    const restBlocks = timeBlocks.filter(
      (b: TimeBlock) => b.caregiver_id === recoveringId && b.block_type === 'rest' && isToday(b.start_time),
    )
    const totalRestMs = restBlocks.reduce((sum: number, b: TimeBlock) => {
      const end = b.end_time ? new Date(b.end_time).getTime() : now
      return sum + (end - new Date(b.start_time).getTime())
    }, 0)
    const totalRestHours = totalRestMs / 3600000
    return { isProtected: totalRestHours >= 2, totalRestHours }
  }, [recoveringId, timeBlocks, now])

  // Handoff targets
  const handoffTargets = caregivers.filter(
    (c: BabyCaregiver) => !currentShift || c.user_id !== currentShift.caregiver_id,
  )

  const handleHandoff = async (targetId: string) => {
    if (isDemo || !babyId || !currentShift) return
    try {
      await updateBlock.mutateAsync({
        id: currentShift.id,
        babyId,
        updates: { end_time: new Date().toISOString() },
      })
      const endTime = new Date(currentShift.end_time).getTime()
      const remaining = endTime - now
      const newEnd = new Date(now + Math.max(remaining, 3600000))
      await addBlock.mutateAsync({
        baby_id: babyId,
        caregiver_id: targetId,
        block_type: 'care',
        start_time: new Date().toISOString(),
        end_time: newEnd.toISOString(),
        notes: null,
      })
      toast.success(t('dashboard.familyStatus.handoffSuccess'))
    } catch {
      toast.error(t('common.error'))
    }
  }

  const handleExtend = async () => {
    if (isDemo || !babyId || !currentShift) return
    try {
      const currentEnd = new Date(currentShift.end_time).getTime()
      const newEnd = new Date(currentEnd + 30 * 60000)
      await updateBlock.mutateAsync({
        id: currentShift.id,
        babyId,
        updates: { end_time: newEnd.toISOString() },
      })
      toast.success(t('dashboard.familyStatus.extendSuccess'))
    } catch {
      toast.error(t('common.error'))
    }
  }

  const handleNeedSupport = () => {
    toast.info(t('dashboard.familyStatus.supportSent'))
  }

  return (
    <Card className="border-slate-200 bg-white transition-all hover:shadow-md">
      <CardContent className="p-4 space-y-4">
        <h3 className="text-base font-bold">{t('dashboard.familyStatus.title')}</h3>

        {caregivers.length === 0 && !isDemo ? (
          /* Empty state */
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <Users className="size-5 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">
                {t('dashboard.familyStatus.noCaregivers')}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {t('dashboard.familyStatus.noCaregivers.hint')}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* 3-panel status row — stacks on mobile */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Baby Status */}
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-1 transition-all hover:shadow-sm">
                <div className="flex items-center gap-1.5">
                  <Baby className="size-4 text-slate-400" />
                  <span className="text-xs font-medium text-slate-500">
                    {t('dashboard.familyStatus.babyStatus')}
                  </span>
                </div>
                {sleepInfo.isSleeping ? (
                  <>
                    <p className="text-lg font-bold">
                      {t('dashboard.familyStatus.sleepDuration')} {formatDuration(sleepInfo.duration)}
                    </p>
                    {nextFeedEstimate && (
                      <p className="text-xs text-slate-500">
                        {t('dashboard.familyStatus.nextFeed')} {formatDuration(nextFeedEstimate)}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-lg font-bold">{t('dashboard.familyStatus.awake')}</p>
                )}
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Lock className="size-3" />
                  <span>{t('dashboard.familyStatus.notifications')}</span>
                </div>
              </div>

              {/* On Duty */}
              <div className="rounded-xl border border-green-100 bg-green-50 p-3 space-y-1 transition-all hover:shadow-sm">
                {currentShift ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs font-medium text-green-700 truncate">
                        {t('dashboard.familyStatus.onDuty')} {onDutyName}
                      </span>
                    </div>
                    <p className="text-lg font-bold">
                      {t('dashboard.familyStatus.onShift')} {formatDuration(onDutyDuration)}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-slate-500">{t('dashboard.familyStatus.noShift')}</p>
                )}
              </div>

              {/* Rest / Mom Recovery */}
              <div className="rounded-xl border border-purple-100 bg-purple-50 p-3 space-y-1 transition-all hover:shadow-sm">
                {restingCaregivers.length > 0 && restingCaregivers[0].isResting ? (
                  <>
                    <span className="text-xs font-medium text-purple-700 truncate block">
                      {restingCaregivers[0].display_name} {t('dashboard.familyStatus.rest')}
                    </span>
                    <p className="text-lg font-bold">
                      {formatDuration(restingCaregivers[0].restDuration)}
                    </p>
                  </>
                ) : restingCaregivers.length > 0 ? (
                  <span className="text-xs text-slate-500 truncate block">
                    {restingCaregivers[0].display_name}
                  </span>
                ) : null}
                {momRecoveryStatus && (
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-purple-600">{t('dashboard.familyStatus.momRecovery')}</span>
                    {momRecoveryStatus.isProtected ? (
                      <span className="flex items-center gap-0.5 text-green-600">
                        <Shield className="size-3" />
                        {t('dashboard.familyStatus.protected')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-0.5 text-amber-600">
                        <AlertTriangle className="size-3" />
                        {t('dashboard.familyStatus.atRisk')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons — stack on mobile */}
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              {handoffTargets.map((c: BabyCaregiver) => (
                <Button
                  key={c.user_id}
                  size="sm"
                  className="rounded-full bg-[#a78bfa] text-white hover:bg-[#8b5cf6] min-h-[44px] transition-all"
                  onClick={() => handleHandoff(c.user_id)}
                  disabled={!currentShift || isDemo || isHandingOff}
                >
                  {isHandingOff ? (
                    <Loader2 className="size-4 animate-spin mr-1" />
                  ) : (
                    <ChevronRight className="size-4 mr-1" />
                  )}
                  {t('dashboard.familyStatus.handoff')} {c.display_name}
                  <ChevronRight className="size-4 ml-1" />
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="rounded-full min-h-[44px] transition-all"
                onClick={handleExtend}
                disabled={!currentShift || isDemo || updateBlock.isPending}
              >
                {updateBlock.isPending && (
                  <Loader2 className="size-4 animate-spin mr-1" />
                )}
                {t('dashboard.familyStatus.extend')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full min-h-[44px] transition-all"
                onClick={handleNeedSupport}
                disabled={isDemo}
              >
                {t('dashboard.familyStatus.needSupport')}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
