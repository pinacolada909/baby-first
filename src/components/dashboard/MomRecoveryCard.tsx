import { useState, useEffect, useMemo } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { useBaby } from '@/contexts/BabyContext'
import { useStandingSessions, useStartStanding, useStopStanding } from '@/hooks/useStandingSessions'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { ChevronDown, Timer, Square, Play, Heart, Loader2 } from 'lucide-react'
import type { StandingSession } from '@/types'

function formatTimer(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

function isToday(dateStr: string): boolean {
  return new Date(dateStr).toDateString() === new Date().toDateString()
}

interface MomRecoveryCardProps {
  babyId: string | undefined
  isDemo: boolean
}

export function MomRecoveryCard({ babyId, isDemo }: MomRecoveryCardProps) {
  const { t } = useLanguage()
  const { user } = useAuth()
  const { selectedBaby } = useBaby()
  const { data: standingSessions = [] } = useStandingSessions(babyId)
  const startStanding = useStartStanding()
  const stopStanding = useStopStanding()

  const [expanded, setExpanded] = useState(true)
  const [timerMs, setTimerMs] = useState(0)

  const recoveringId = selectedBaby?.recovering_caregiver_id

  // Find active standing session
  const activeSession = useMemo(() => {
    return standingSessions.find((s: StandingSession) => !s.end_time) ?? null
  }, [standingSessions])

  // Live timer for active session
  useEffect(() => {
    if (!activeSession) {
      setTimerMs(0)
      return
    }
    const start = new Date(activeSession.start_time).getTime()
    setTimerMs(Date.now() - start)
    const interval = setInterval(() => {
      setTimerMs(Date.now() - start)
    }, 1000)
    return () => clearInterval(interval)
  }, [activeSession])

  // Today's total standing time
  const todayTotalMs = useMemo(() => {
    const now = Date.now()
    return standingSessions
      .filter((s: StandingSession) => isToday(s.start_time))
      .reduce((sum: number, s: StandingSession) => {
        const end = s.end_time ? new Date(s.end_time).getTime() : now
        return sum + (end - new Date(s.start_time).getTime())
      }, 0)
  }, [standingSessions])

  const todayTotalMin = Math.floor(todayTotalMs / 60000)

  const handleStart = async () => {
    if (isDemo || !babyId || !user) return
    await startStanding.mutateAsync({ baby_id: babyId, caregiver_id: user.id })
  }

  const handleStop = async () => {
    if (isDemo || !babyId || !activeSession) return
    await stopStanding.mutateAsync({ id: activeSession.id, babyId })
  }

  if (!recoveringId) {
    return (
      <Card className="border-slate-200 bg-white transition-all hover:shadow-md">
        <CardContent className="p-4 space-y-2">
          <h3 className="text-base font-bold">{t('dashboard.momRecovery.title')}</h3>
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-50">
              <Heart className="size-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">
                {t('dashboard.momRecovery.noRecovering')}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {t('dashboard.momRecovery.noRecovering.hint')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-slate-200 bg-white transition-all hover:shadow-md">
      <CardContent className="p-4 space-y-4">
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleTrigger asChild>
            <button
              className="flex w-full items-center justify-between"
              aria-expanded={expanded}
            >
              <h3 className="text-base font-bold">{t('dashboard.momRecovery.title')}</h3>
              <ChevronDown
                className={`size-5 text-slate-400 transition-transform duration-200 ${expanded ? '' : '-rotate-90'}`}
              />
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
            <div className="space-y-4 pt-4">
              {/* Standing timer */}
              <div className="rounded-xl border border-orange-100 bg-orange-50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Timer className="size-4 text-orange-500" />
                  <span className="text-sm font-medium text-orange-700">
                    {t('dashboard.momRecovery.standingTime')}
                  </span>
                  {activeSession && (
                    <span className="size-2 rounded-full bg-orange-500 animate-pulse" />
                  )}
                </div>

                {activeSession ? (
                  <div className="flex items-center justify-between">
                    <span className="text-2xl sm:text-3xl font-bold tabular-nums text-orange-600" aria-live="polite">
                      {formatTimer(timerMs)}
                    </span>
                    <Button
                      size="sm"
                      className="rounded-full bg-red-500 text-white hover:bg-red-600 min-h-[44px] transition-all"
                      onClick={handleStop}
                      disabled={isDemo || stopStanding.isPending}
                    >
                      {stopStanding.isPending ? (
                        <Loader2 className="size-4 animate-spin mr-1" />
                      ) : (
                        <Square className="size-4 mr-1" />
                      )}
                      {t('dashboard.momRecovery.stopTimer')}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-2xl sm:text-3xl font-bold tabular-nums text-slate-300">00:00</span>
                    <Button
                      size="sm"
                      className="rounded-full bg-orange-500 text-white hover:bg-orange-600 min-h-[44px] transition-all"
                      onClick={handleStart}
                      disabled={isDemo || startStanding.isPending}
                    >
                      {startStanding.isPending ? (
                        <Loader2 className="size-4 animate-spin mr-1" />
                      ) : (
                        <Play className="size-4 mr-1" />
                      )}
                      {t('dashboard.momRecovery.startTimer')}
                    </Button>
                  </div>
                )}

                {/* Today's total */}
                <p className="text-xs text-orange-600">
                  {t('dashboard.momRecovery.standingTime')} ({t('dashboard.todayTasks.title').toLowerCase()}): {todayTotalMin} {t('dashboard.workload.min')}
                </p>
              </div>

              {/* Rest recommendation */}
              {todayTotalMin >= 30 && (
                <div className="rounded-xl border border-purple-100 bg-purple-50 p-4">
                  <p className="text-sm text-purple-700">
                    {t('dashboard.momRecovery.restRecommend')}: 15-20 {t('dashboard.workload.min')}
                  </p>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}
