import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { useBaby } from '@/contexts/BabyContext'
import { useTimeBlocks } from '@/hooks/useTimeBlocks'
import { useCaregivers } from '@/hooks/useCaregivers'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { queryKeys } from '@/lib/query-keys'
import { Button } from '@/components/ui/button'
import { UserCheck } from 'lucide-react'
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

  if (!shiftInfo.onDuty) {
    return (
      <section className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-300 shadow-lg shadow-slate-300/20">
          <UserCheck className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {t('home.shift.currentCaregiver')}
          </p>
          <p className="text-sm text-muted-foreground">{t('home.shift.noShift')}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/time-management')}
          className="text-xs"
        >
          {t('home.shift.setup')}
        </Button>
      </section>
    )
  }

  return (
    <section className="flex items-center gap-4 rounded-2xl border border-sky-100 bg-sky-50 p-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500 shadow-lg shadow-sky-500/20">
        <UserCheck className="h-5 w-5 text-white" />
      </div>
      <div className="flex-1">
        <div className="mb-0.5 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wide text-sky-600">
            {t('home.shift.currentCaregiver')}
          </p>
          <span className="rounded-full bg-sky-500 px-2 py-0.5 text-[10px] font-bold text-white">
            {t('home.shift.onDuty').toUpperCase()}
          </span>
        </div>
        <h3 className="text-sm font-bold text-slate-800">{shiftInfo.onDuty.name}</h3>
        <p className="text-[10px] text-slate-500">
          {t('home.shift.shiftEnds')}: {shiftInfo.onDuty.end}
        </p>
      </div>
    </section>
  )
}
