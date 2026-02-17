import { useState, useMemo } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { useBaby } from '@/contexts/BabyContext'
import { useDiaperChanges, useAddDiaperChange, useDeleteDiaperChange } from '@/hooks/useDiaperChanges'
import { useCaregivers } from '@/hooks/useCaregivers'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { queryKeys } from '@/lib/query-keys'
import type { DiaperChange, DiaperStatus, BabyCaregiver, ParsedDiaperData } from '@/types'
import { VoiceInputButton } from '@/components/voice/VoiceInputButton'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Baby, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

function formatDatetimeLocal(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function isToday(dateStr: string): boolean {
  return new Date(dateStr).toDateString() === new Date().toDateString()
}

const STATUS_COLORS: Record<DiaperStatus, string> = {
  wet: 'bg-blue-100 text-blue-700 border-blue-300',
  dirty: 'bg-amber-100 text-amber-700 border-amber-300',
  mixed: 'bg-orange-100 text-orange-700 border-orange-300',
  dry: 'bg-gray-100 text-gray-700 border-gray-300',
}

const STATUSES: DiaperStatus[] = ['wet', 'dirty', 'mixed', 'dry']

export function DiaperTrackerPage() {
  const { t } = useLanguage()
  const { user, isDemo } = useAuth()
  const { selectedBaby } = useBaby()
  const babyId = isDemo ? undefined : selectedBaby?.id

  const { data: dbChanges = [] } = useDiaperChanges(babyId)
  const { data: caregivers = [] } = useCaregivers(babyId)
  const addMutation = useAddDiaperChange()
  const deleteMutation = useDeleteDiaperChange()
  useRealtimeSync('diaper_changes', babyId, queryKeys.diaper.byBaby(babyId ?? ''))

  const isPrimary = caregivers.some(
    (c: BabyCaregiver) => c.user_id === user?.id && c.role === 'primary',
  )
  const canDelete = (record: DiaperChange) =>
    isDemo || isPrimary || record.caregiver_id === user?.id

  const [demoChanges, setDemoChanges] = useState<DiaperChange[]>([])
  const changes = isDemo ? demoChanges : dbChanges

  const [time, setTime] = useState(formatDatetimeLocal(new Date()))
  const [status, setStatus] = useState<DiaperStatus>('wet')
  const [notes, setNotes] = useState('')

  const todayChanges = useMemo(() => changes.filter((c) => isToday(c.changed_at)), [changes])
  const todayCounts = useMemo(() => {
    const counts: Record<DiaperStatus, number> = { wet: 0, dirty: 0, mixed: 0, dry: 0 }
    todayChanges.forEach((c) => { counts[c.status]++ })
    return counts
  }, [todayChanges])

  const handleAdd = async () => {
    const change = {
      baby_id: babyId ?? 'demo',
      caregiver_id: user?.id ?? 'demo',
      changed_at: new Date(time).toISOString(),
      status,
      notes: notes || null,
    }

    if (isDemo) {
      setDemoChanges((prev) => [
        { ...change, id: crypto.randomUUID(), created_at: new Date().toISOString() },
        ...prev,
      ])
    } else {
      await addMutation.mutateAsync(change)
    }
    setNotes('')
    setTime(formatDatetimeLocal(new Date()))
    toast.success(t('diaper.added'))
  }

  const handleDelete = async (id: string) => {
    if (isDemo) {
      setDemoChanges((prev) => prev.filter((c) => c.id !== id))
    } else {
      await deleteMutation.mutateAsync({ id, babyId: babyId! })
    }
    toast.success(t('diaper.deleted'))
  }

  const statusTranslation = (s: DiaperStatus) => t(`diaper.status.${s}` as `diaper.status.${'wet' | 'dirty' | 'mixed' | 'dry'}`)

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">{t('diaper.title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('diaper.subtitle')}</p>
      </div>

      {/* Today's Summary */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Baby className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('diaper.today')}</p>
              <p className="text-2xl font-bold text-green-700">{todayChanges.length} {t('diaper.total')}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <Badge key={s} variant="outline" className={STATUS_COLORS[s]}>
                {statusTranslation(s)}: {todayCounts[s]}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Log Form */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="text-lg font-semibold">{t('diaper.log')}</h2>
          <div>
            <Label>{t('diaper.time')}</Label>
            <Input type="datetime-local" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div>
            <Label>{t('diaper.status')}</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <Button
                  key={s}
                  variant={status === s ? 'default' : 'outline'}
                  size="sm"
                  className={status === s ? '' : STATUS_COLORS[s]}
                  onClick={() => setStatus(s)}
                >
                  {statusTranslation(s)}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <Label>{t('diaper.notes')}</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('diaper.notes')} />
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleAdd}>{t('diaper.add')}</Button>
            {!isDemo && (
              <VoiceInputButton
                trackerType="diaper"
                onParsed={(data) => {
                  const d = data as ParsedDiaperData
                  if (d.time) setTime(formatDatetimeLocal(new Date(d.time)))
                  if (d.status) setStatus(d.status)
                  if (d.notes) setNotes(d.notes)
                }}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardContent className="p-6">
          <h2 className="mb-4 text-lg font-semibold">{t('diaper.history')}</h2>
          {changes.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground">{t('diaper.empty')}</p>
          ) : (
            <div className="space-y-2">
              {changes.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={STATUS_COLORS[c.status]}>
                      {statusTranslation(c.status)}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">{new Date(c.changed_at).toLocaleString()}</p>
                      {c.notes && <p className="text-xs text-muted-foreground">{c.notes}</p>}
                    </div>
                  </div>
                  {canDelete(c) && (
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
