import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { useBaby } from '@/contexts/BabyContext'
import { useTimeBlocks } from '@/hooks/useTimeBlocks'
import { useCaregivers } from '@/hooks/useCaregivers'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { queryKeys } from '@/lib/query-keys'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { TimeBlock, BabyCaregiver } from '@/types'

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function isToday(dateStr: string): boolean {
  return new Date(dateStr).toDateString() === new Date().toDateString()
}

interface ShiftInfo {
  onDuty: { name: string; start: string; end: string } | null
  others: { name: string; status: 'sleeping' | 'standby' }[]
}

function computeShiftInfo(
  timeBlocks: TimeBlock[],
  caregivers: BabyCaregiver[],
): ShiftInfo {
  const now = Date.now()
  const todayBlocks = timeBlocks.filter(
    (b) => isToday(b.start_time) || isToday(b.end_time),
  )

  // Find who is currently on duty
  const currentCareBlock = todayBlocks.find(
    (b) =>
      b.block_type === 'care' &&
      new Date(b.start_time).getTime() <= now &&
      new Date(b.end_time).getTime() >= now,
  )

  const caregiverName = (id: string) =>
    caregivers.find((c) => c.user_id === id)?.display_name ?? '?'

  const onDuty = currentCareBlock
    ? {
        name: caregiverName(currentCareBlock.caregiver_id),
        start: formatTime(currentCareBlock.start_time),
        end: formatTime(currentCareBlock.end_time),
      }
    : null

  // Check other caregivers' status
  const onDutyId = currentCareBlock?.caregiver_id
  const others = caregivers
    .filter((c) => c.user_id !== onDutyId)
    .map((c) => {
      const restBlock = todayBlocks.find(
        (b) =>
          b.caregiver_id === c.user_id &&
          b.block_type === 'rest' &&
          new Date(b.start_time).getTime() <= now &&
          new Date(b.end_time).getTime() >= now,
      )
      return {
        name: c.display_name,
        status: restBlock ? ('sleeping' as const) : ('standby' as const),
      }
    })

  return { onDuty, others }
}

export function CurrentShiftCard() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { selectedBaby } = useBaby()
  const babyId = user ? selectedBaby?.id : undefined

  const { data: timeBlocks = [] } = useTimeBlocks(babyId)
  const { data: caregivers = [] } = useCaregivers(babyId)

  useRealtimeSync('time_blocks', babyId, queryKeys.timeBlocks.byBaby(babyId ?? ''))

  const shiftInfo = useMemo(
    () => computeShiftInfo(timeBlocks, caregivers),
    [timeBlocks, caregivers],
  )

  const hasAnyShifts = timeBlocks.some((b) => isToday(b.start_time) || isToday(b.end_time))

  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
      <CardContent className="p-5">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-blue-600">
          🛎 {t('home.shift.title')}
        </p>

        {shiftInfo.onDuty ? (
          <>
            <div className="mb-3">
              <p className="text-lg font-bold">
                {shiftInfo.onDuty.name}{' '}
                <span className="text-blue-600">🟦 {t('home.shift.onDuty')}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                {shiftInfo.onDuty.start} — {shiftInfo.onDuty.end}
              </p>
            </div>

            {shiftInfo.others.length > 0 && (
              <div className="space-y-1 text-sm">
                {shiftInfo.others.map((other) => (
                  <p key={other.name} className="text-muted-foreground">
                    {other.name}{' '}
                    {other.status === 'sleeping' ? (
                      <span>😴 {t('home.shift.sleeping')}</span>
                    ) : (
                      <span>{t('home.shift.standby')}</span>
                    )}
                  </p>
                ))}
              </div>
            )}
          </>
        ) : (
          <div>
            <p className="mb-2 text-sm text-muted-foreground">
              {hasAnyShifts
                ? t('home.shift.noShift')
                : t('home.shift.noShift')}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/time-management')}
              className="text-xs"
            >
              {t('home.shift.setup')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
