import { useState, useMemo } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { useCaregivers } from '@/hooks/useCaregivers'
import { useTimeBlocks, useAddTimeBlock, useDeleteTimeBlock } from '@/hooks/useTimeBlocks'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { queryKeys } from '@/lib/query-keys'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { BabyCaregiver, TimeBlock } from '@/types'

interface ShiftSchedulerProps {
  babyId: string | undefined
  isDemo: boolean
}

function isToday(dateStr: string): boolean {
  return new Date(dateStr).toDateString() === new Date().toDateString()
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function ShiftScheduler({ babyId, isDemo }: ShiftSchedulerProps) {
  const { t } = useLanguage()
  const { user } = useAuth()
  const { data: caregivers = [] } = useCaregivers(babyId)
  const { data: timeBlocks = [] } = useTimeBlocks(babyId)
  const addBlock = useAddTimeBlock()
  const deleteBlock = useDeleteTimeBlock()

  useRealtimeSync('time_blocks', babyId, queryKeys.timeBlocks.byBaby(babyId ?? ''))

  const [selectedCaregiver, setSelectedCaregiver] = useState('')
  const [startTime, setStartTime] = useState('22:00')
  const [endTime, setEndTime] = useState('06:00')
  const [blockType, setBlockType] = useState<'care' | 'rest'>('care')

  // Demo state
  const [demoBlocks, setDemoBlocks] = useState<(TimeBlock & { caregiverName: string })[]>([])

  const todayBlocks = useMemo(() => {
    if (isDemo) return demoBlocks
    return timeBlocks
      .filter((b) => isToday(b.start_time))
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  }, [timeBlocks, demoBlocks, isDemo])

  const caregiverList: BabyCaregiver[] = isDemo
    ? [
        { user_id: 'demo-1', display_name: 'Parent 1', role: 'primary', baby_id: 'demo', joined_at: '' },
        { user_id: 'demo-2', display_name: 'Parent 2', role: 'member', baby_id: 'demo', joined_at: '' },
      ]
    : caregivers

  const caregiverName = (id: string) =>
    caregiverList.find((c) => c.user_id === id)?.display_name ?? '?'

  const isPrimary = caregiverList.some(
    (c: BabyCaregiver) => c.user_id === user?.id && c.role === 'primary',
  )

  const handleAdd = async () => {
    const cgId = selectedCaregiver || caregiverList[0]?.user_id
    if (!cgId) return

    const today = new Date()
    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)

    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), sh, sm)
    let end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), eh, em)
    // Handle overnight shifts (e.g., 22:00 - 06:00)
    if (end <= start) {
      end.setDate(end.getDate() + 1)
    }

    if (isDemo) {
      setDemoBlocks((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          baby_id: 'demo',
          caregiver_id: cgId,
          block_type: blockType,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          notes: null,
          created_at: new Date().toISOString(),
          caregiverName: caregiverName(cgId),
        },
      ])
      toast.success(t('shift.added'))
      return
    }

    if (!babyId || !user) return
    try {
      await addBlock.mutateAsync({
        baby_id: babyId,
        caregiver_id: cgId,
        block_type: blockType,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        notes: null,
      })
      toast.success(t('shift.added'))
    } catch {
      toast.error(t('common.error'))
    }
  }

  const handleDelete = async (id: string) => {
    if (isDemo) {
      setDemoBlocks((prev) => prev.filter((b) => b.id !== id))
      toast.success(t('shift.deleted'))
      return
    }
    if (!babyId) return
    try {
      await deleteBlock.mutateAsync({ id, babyId })
      toast.success(t('shift.deleted'))
    } catch {
      toast.error(t('common.error'))
    }
  }

  const canDelete = (block: TimeBlock) =>
    isDemo || isPrimary || block.caregiver_id === user?.id

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <h3 className="text-sm font-medium">{t('shift.title')}</h3>

        {/* Add shift form */}
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[120px] flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">{t('shift.caregiver')}</label>
            <select
              value={selectedCaregiver || caregiverList[0]?.user_id || ''}
              onChange={(e) => setSelectedCaregiver(e.target.value)}
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
            >
              {caregiverList.map((c) => (
                <option key={c.user_id} value={c.user_id}>
                  {c.display_name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-[90px]">
            <label className="mb-1 block text-xs text-muted-foreground">{t('shift.start')}</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
            />
          </div>
          <div className="w-[90px]">
            <label className="mb-1 block text-xs text-muted-foreground">{t('shift.end')}</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
            />
          </div>
          <div className="w-[100px]">
            <label className="mb-1 block text-xs text-muted-foreground">{t('shift.type')}</label>
            <select
              value={blockType}
              onChange={(e) => setBlockType(e.target.value as 'care' | 'rest')}
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
            >
              <option value="care">{t('shift.care')}</option>
              <option value="rest">{t('shift.rest')}</option>
            </select>
          </div>
          <Button size="sm" onClick={handleAdd} className="h-9">
            <Plus className="mr-1 h-4 w-4" />
            {t('shift.add')}
          </Button>
        </div>

        {/* Today's shifts */}
        <div>
          <h4 className="mb-2 text-xs font-medium text-muted-foreground">{t('shift.today')}</h4>
          {todayBlocks.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('shift.empty')}</p>
          ) : (
            <div className="space-y-2">
              {todayBlocks.map((block) => (
                <div
                  key={block.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={block.block_type === 'care' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {block.block_type === 'care' ? t('shift.care') : t('shift.rest')}
                    </Badge>
                    <span className="text-sm font-medium">{caregiverName(block.caregiver_id)}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(block.start_time)} — {formatTime(block.end_time)}
                    </span>
                  </div>
                  {canDelete(block) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(block.id)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
