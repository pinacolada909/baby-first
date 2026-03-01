import { useMemo, useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useBaby } from '@/contexts/BabyContext'
import { useSleepSessions } from '@/hooks/useSleepSessions'
import { useFeedings } from '@/hooks/useFeedings'
import { useTimeBlocks, useAddTimeBlock, useUpdateTimeBlock, useDeleteTimeBlock } from '@/hooks/useTimeBlocks'
import { useCaregivers } from '@/hooks/useCaregivers'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Baby, Shield, Lock, ChevronRight, ChevronDown, AlertTriangle,
  Users, Loader2, Play, Clock, Plus, Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { TimeBlock, BabyCaregiver } from '@/types'

function formatDuration(ms: number): string {
  const totalMin = Math.floor(ms / 60000)
  if (totalMin < 60) return `${totalMin} min`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
  const [historyOpen, setHistoryOpen] = useState(true)
  const [showLogForm, setShowLogForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Log form state
  const [logCaregiver, setLogCaregiver] = useState('')
  const [logStartTime, setLogStartTime] = useState('')
  const [logEndTime, setLogEndTime] = useState('')
  const [logType, setLogType] = useState<'care' | 'rest'>('care')

  const { data: sleepSessions = [] } = useSleepSessions(babyId)
  const { data: feedings = [] } = useFeedings(babyId)
  const { data: timeBlocks = [] } = useTimeBlocks(babyId)
  const { data: caregivers = [] } = useCaregivers(babyId)
  const addBlock = useAddTimeBlock()
  const updateBlock = useUpdateTimeBlock()
  const deleteBlock = useDeleteTimeBlock()

  // Check if current user is primary caregiver
  const isPrimary = caregivers.some(
    (c: BabyCaregiver) => c.user_id === user?.id && c.role === 'primary',
  )

  const now = Date.now()
  const isBusy = addBlock.isPending || updateBlock.isPending

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
  const recoveringName = recoveringId ? caregiverName(recoveringId) : null
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

  // Today's shifts (for history log) — both care and rest, excluding current active shift
  const todayShifts = useMemo(() => {
    return timeBlocks
      .filter(
        (b: TimeBlock) =>
          isToday(b.start_time) &&
          (!currentShift || b.id !== currentShift.id),
      )
      .sort((a: TimeBlock, b: TimeBlock) =>
        new Date(b.start_time).getTime() - new Date(a.start_time).getTime(),
      )
  }, [timeBlocks, currentShift])

  // Button targets: when shift active, show other caregivers; when no shift, show all caregivers
  const buttonTargets = currentShift
    ? caregivers.filter((c: BabyCaregiver) => c.user_id !== currentShift.caregiver_id)
    : caregivers

  // Start a new 2-hour shift for a caregiver (when no shift is active)
  const handleStartShift = async (targetId: string) => {
    if (isDemo || !babyId) return
    try {
      const startTime = new Date()
      const endTime = new Date(startTime.getTime() + 2 * 3600000) // 2 hours
      await addBlock.mutateAsync({
        baby_id: babyId,
        caregiver_id: targetId,
        block_type: 'care',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        notes: null,
      })
      toast.success(t('dashboard.familyStatus.startShiftSuccess'))
    } catch {
      toast.error(t('common.error'))
    }
  }

  // Hand off active shift to another caregiver
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

  // Log a past shift that was forgotten
  const handleLogPastShift = async () => {
    const cgId = logCaregiver || caregivers[0]?.user_id
    if (isDemo || !babyId || !cgId || !logStartTime || !logEndTime) return
    try {
      const today = new Date()
      const [sh, sm] = logStartTime.split(':').map(Number)
      const [eh, em] = logEndTime.split(':').map(Number)

      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), sh, sm)
      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), eh, em)
      // Handle overnight (e.g., 22:00 — 06:00)
      if (end <= start) end.setDate(end.getDate() + 1)

      await addBlock.mutateAsync({
        baby_id: babyId,
        caregiver_id: cgId,
        block_type: logType,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        notes: null,
      })
      toast.success(t('dashboard.familyStatus.logPastShift.success'))
      setShowLogForm(false)
      setLogStartTime('')
      setLogEndTime('')
    } catch {
      toast.error(t('common.error'))
    }
  }

  // Delete a shift record (primary caregiver or own record)
  const handleDeleteShift = async (blockId: string) => {
    if (!babyId) return
    setDeletingId(blockId)
    try {
      await deleteBlock.mutateAsync({ id: blockId, babyId })
      toast.success(t('shift.deleted'))
    } catch {
      toast.error(t('common.error'))
    } finally {
      setDeletingId(null)
    }
  }

  // Can delete if primary caregiver or own block
  const canDelete = (block: TimeBlock) =>
    isPrimary || block.caregiver_id === user?.id

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
                {momRecoveryStatus && recoveringName && (
                  <div className="flex items-center gap-1 text-xs flex-wrap">
                    <span className="font-medium text-purple-700">{recoveringName}</span>
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

            {/* Action buttons — dual mode */}
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              {currentShift ? (
                <>
                  {/* Shift active → Handoff + Extend */}
                  {buttonTargets.map((c: BabyCaregiver) => (
                    <Button
                      key={c.user_id}
                      size="sm"
                      className="rounded-full bg-[#a78bfa] text-white hover:bg-[#8b5cf6] min-h-[44px] transition-all"
                      onClick={() => handleHandoff(c.user_id)}
                      disabled={isDemo || isBusy}
                    >
                      {isBusy ? (
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
                    disabled={isDemo || updateBlock.isPending}
                  >
                    {updateBlock.isPending && (
                      <Loader2 className="size-4 animate-spin mr-1" />
                    )}
                    {t('dashboard.familyStatus.extend')}
                  </Button>
                </>
              ) : (
                <>
                  {/* No shift → Start shift for any caregiver */}
                  {buttonTargets.map((c: BabyCaregiver) => (
                    <Button
                      key={c.user_id}
                      size="sm"
                      className="rounded-full bg-[#a78bfa] text-white hover:bg-[#8b5cf6] min-h-[44px] transition-all"
                      onClick={() => handleStartShift(c.user_id)}
                      disabled={isDemo || isBusy}
                    >
                      {isBusy ? (
                        <Loader2 className="size-4 animate-spin mr-1" />
                      ) : (
                        <Play className="size-4 mr-1" />
                      )}
                      {t('dashboard.familyStatus.startShift')} {c.display_name}
                    </Button>
                  ))}
                </>
              )}
            </div>

            {/* Today's Shift History + Log Past Shift */}
            <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
              <div className="flex items-center gap-2">
                <CollapsibleTrigger asChild>
                  <button className="flex flex-1 items-center gap-2 rounded-lg px-1 py-1.5 text-left text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                    <ChevronDown
                      className={`size-4 text-slate-400 transition-transform duration-200 ${historyOpen ? '' : '-rotate-90'}`}
                    />
                    <Clock className="size-4 text-slate-400" />
                    <span>{t('dashboard.familyStatus.recentShifts')}</span>
                    {todayShifts.length > 0 && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                        {todayShifts.length}
                      </span>
                    )}
                  </button>
                </CollapsibleTrigger>
                {!isDemo && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 text-xs text-slate-500 hover:text-[#a78bfa]"
                    onClick={() => setShowLogForm(!showLogForm)}
                  >
                    <Plus className="size-3.5" />
                    {t('dashboard.familyStatus.logPastShift')}
                  </Button>
                )}
              </div>
              <CollapsibleContent>
                <div className="mt-2 space-y-2">
                  {/* Log Past Shift Form */}
                  {showLogForm && (
                    <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-3 space-y-3">
                      <div className="flex flex-wrap items-end gap-2">
                        {/* Caregiver */}
                        <div className="min-w-[110px] flex-1">
                          <label className="mb-1 block text-xs font-medium text-slate-600">
                            {t('dashboard.familyStatus.logPastShift.caregiver')}
                          </label>
                          <select
                            value={logCaregiver || caregivers[0]?.user_id || ''}
                            onChange={(e) => setLogCaregiver(e.target.value)}
                            className="h-9 w-full rounded-md border bg-white px-2 text-sm"
                          >
                            {caregivers.map((c: BabyCaregiver) => (
                              <option key={c.user_id} value={c.user_id}>
                                {c.display_name}
                              </option>
                            ))}
                          </select>
                        </div>
                        {/* Start time */}
                        <div className="w-[100px]">
                          <label className="mb-1 block text-xs font-medium text-slate-600">
                            {t('dashboard.familyStatus.logPastShift.start')}
                          </label>
                          <input
                            type="time"
                            value={logStartTime}
                            onChange={(e) => setLogStartTime(e.target.value)}
                            className="h-9 w-full rounded-md border bg-white px-2 text-sm"
                          />
                        </div>
                        {/* End time */}
                        <div className="w-[100px]">
                          <label className="mb-1 block text-xs font-medium text-slate-600">
                            {t('dashboard.familyStatus.logPastShift.end')}
                          </label>
                          <input
                            type="time"
                            value={logEndTime}
                            onChange={(e) => setLogEndTime(e.target.value)}
                            className="h-9 w-full rounded-md border bg-white px-2 text-sm"
                          />
                        </div>
                        {/* Type */}
                        <div className="w-[100px]">
                          <label className="mb-1 block text-xs font-medium text-slate-600">
                            {t('dashboard.familyStatus.logPastShift.type')}
                          </label>
                          <select
                            value={logType}
                            onChange={(e) => setLogType(e.target.value as 'care' | 'rest')}
                            className="h-9 w-full rounded-md border bg-white px-2 text-sm"
                          >
                            <option value="care">{t('dashboard.familyStatus.logPastShift.care')}</option>
                            <option value="rest">{t('dashboard.familyStatus.logPastShift.rest')}</option>
                          </select>
                        </div>
                        {/* Save */}
                        <Button
                          size="sm"
                          className="h-9"
                          onClick={handleLogPastShift}
                          disabled={!logStartTime || !logEndTime || addBlock.isPending}
                        >
                          {addBlock.isPending ? (
                            <Loader2 className="size-4 animate-spin mr-1" />
                          ) : null}
                          {t('dashboard.familyStatus.logPastShift.save')}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Shift list */}
                  {todayShifts.length === 0 ? (
                    <p className="py-3 text-center text-xs text-slate-400">
                      {t('dashboard.familyStatus.noRecentShifts')}
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {todayShifts.map((block: TimeBlock) => {
                        const duration =
                          new Date(block.end_time).getTime() - new Date(block.start_time).getTime()
                        const isActive =
                          new Date(block.start_time).getTime() <= now &&
                          new Date(block.end_time).getTime() >= now
                        const isCare = block.block_type === 'care'
                        return (
                          <div
                            key={block.id}
                            className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition-all ${
                              isActive
                                ? 'border-green-200 bg-green-50'
                                : 'border-slate-100 bg-slate-50/50'
                            }`}
                          >
                            {/* Timeline dot */}
                            <span
                              className={`size-2.5 shrink-0 rounded-full ${
                                isActive
                                  ? 'bg-green-500 animate-pulse'
                                  : isCare
                                    ? 'bg-violet-400'
                                    : 'bg-blue-300'
                              }`}
                            />

                            {/* Caregiver + time */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-medium truncate">
                                  {caregiverName(block.caregiver_id)}
                                </p>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                  isCare
                                    ? 'bg-violet-100 text-violet-600'
                                    : 'bg-blue-100 text-blue-600'
                                }`}>
                                  {isCare
                                    ? t('dashboard.familyStatus.logPastShift.care')
                                    : t('dashboard.familyStatus.logPastShift.rest')}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500">
                                {formatTime(block.start_time)} — {formatTime(block.end_time)}
                              </p>
                            </div>

                            {/* Duration badge + delete */}
                            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                              {formatDuration(duration)}
                            </span>
                            {canDelete(block) && (
                              <button
                                onClick={() => handleDeleteShift(block.id)}
                                disabled={deletingId === block.id}
                                className="shrink-0 p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                              >
                                {deletingId === block.id ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="size-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </CardContent>
    </Card>
  )
}
