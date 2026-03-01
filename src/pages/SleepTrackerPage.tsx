import { useState, useMemo, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { useBaby } from '@/contexts/BabyContext'
import { useSleepSessions, useAddSleep, useUpdateSleep, useDeleteSleep } from '@/hooks/useSleepSessions'
import { useCaregivers } from '@/hooks/useCaregivers'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { queryKeys } from '@/lib/query-keys'
import type { SleepSession, BabyCaregiver, ParsedSleepData } from '@/types'
import { VoiceInputButton } from '@/components/voice/VoiceInputButton'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Moon, Trash2, Lightbulb, Sun } from 'lucide-react'
import { toast } from 'sonner'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

function formatDatetimeLocal(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  return d.toDateString() === now.toDateString()
}

function formatElapsed(ms: number): string {
  const totalMin = Math.floor(ms / 60000)
  if (totalMin < 60) return `${totalMin}m`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function SleepTrackerPage() {
  const { t } = useLanguage()
  const { user, isDemo } = useAuth()
  const { selectedBaby } = useBaby()
  const babyId = isDemo ? undefined : selectedBaby?.id

  // DB hooks
  const { data: dbSessions = [] } = useSleepSessions(babyId)
  const { data: caregivers = [] } = useCaregivers(babyId)
  const addMutation = useAddSleep()
  const updateMutation = useUpdateSleep()
  const deleteMutation = useDeleteSleep()
  useRealtimeSync('sleep_sessions', babyId, queryKeys.sleep.byBaby(babyId ?? ''))

  const isPrimary = caregivers.some(
    (c: BabyCaregiver) => c.user_id === user?.id && c.role === 'primary',
  )
  const canDelete = (record: SleepSession) =>
    isDemo || isPrimary || record.caregiver_id === user?.id

  // Demo state
  const [demoSessions, setDemoSessions] = useState<SleepSession[]>([])

  const sessions = isDemo ? demoSessions : dbSessions

  // Active (ongoing) sleep session — end_time is null
  const activeSleep = useMemo(
    () => sessions.find((s) => s.end_time === null) ?? null,
    [sessions],
  )

  // Live timer for active sleep
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!activeSleep) return
    const id = setInterval(() => setNow(Date.now()), 15000) // update every 15s
    return () => clearInterval(id)
  }, [activeSleep])

  // Form state
  const currentTime = new Date()
  const oneHourAgo = new Date(currentTime.getTime() - 3600000)
  const [startTime, setStartTime] = useState(formatDatetimeLocal(oneHourAgo))
  const [endTime, setEndTime] = useState(formatDatetimeLocal(currentTime))
  const [notes, setNotes] = useState('')
  const [stillSleeping, setStillSleeping] = useState(false)
  const [period, setPeriod] = useState('week')

  const duration = useMemo(() => {
    if (stillSleeping) return 0
    const start = new Date(startTime)
    const end = new Date(endTime)
    let diff = (end.getTime() - start.getTime()) / 3600000
    if (diff < 0) diff += 24
    return Math.round(diff * 100) / 100
  }, [startTime, endTime, stillSleeping])

  const todayTotal = useMemo(() => {
    return sessions
      .filter((s) => isToday(s.start_time))
      .reduce((sum, s) => sum + (s.duration_hours ?? 0), 0)
  }, [sessions])

  const chartData = useMemo(() => {
    const now = new Date()
    let days: number
    if (period === 'week') {
      days = 7
    } else {
      days = 30
    }

    const buckets: Record<string, { label: string; hours: number; date: Date }> = {}
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 86400000)
      const label = `${date.getMonth() + 1}/${date.getDate()}`
      buckets[label] = { label, hours: 0, date }
    }

    sessions.forEach((s) => {
      const d = new Date(s.start_time)
      const label = `${d.getMonth() + 1}/${d.getDate()}`
      if (buckets[label]) {
        buckets[label].hours += s.duration_hours ?? 0
      }
    })

    return Object.values(buckets)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(({ label, hours }) => ({ label, hours: Math.round(hours * 10) / 10 }))
  }, [sessions, period])

  const handleAdd = async () => {
    // Prevent starting a new sleep if one is already ongoing
    if (stillSleeping && activeSleep) {
      toast.error(t('sleep.alreadySleeping'))
      return
    }

    const newStart = new Date(startTime).getTime()

    if (!stillSleeping) {
      const newEnd = new Date(endTime).getTime()

      // Check for time overlap with existing completed sessions
      const overlap = sessions.find((s) => {
        if (!s.end_time) return false
        const existStart = new Date(s.start_time).getTime()
        const existEnd = new Date(s.end_time).getTime()
        return newStart < existEnd && newEnd > existStart
      })

      if (overlap) {
        toast.error(t('sleep.overlap'))
        return
      }
    }

    const session = {
      baby_id: babyId ?? 'demo',
      caregiver_id: user?.id ?? 'demo',
      start_time: new Date(startTime).toISOString(),
      end_time: stillSleeping ? null : new Date(endTime).toISOString(),
      duration_hours: stillSleeping ? null : duration,
      notes: notes || null,
    }

    if (isDemo) {
      setDemoSessions((prev) => [
        { ...session, id: crypto.randomUUID(), created_at: new Date().toISOString() },
        ...prev,
      ])
    } else {
      await addMutation.mutateAsync(session)
    }
    setNotes('')
    setStillSleeping(false)
    toast.success(stillSleeping ? t('sleep.started') : t('sleep.added'))
  }

  const handleWakeUp = async (session: SleepSession) => {
    const endTime = new Date()
    const startMs = new Date(session.start_time).getTime()
    let diffHours = (endTime.getTime() - startMs) / 3600000
    if (diffHours < 0) diffHours += 24
    const durationHours = Math.round(diffHours * 100) / 100

    if (isDemo) {
      setDemoSessions((prev) =>
        prev.map((s) =>
          s.id === session.id
            ? { ...s, end_time: endTime.toISOString(), duration_hours: durationHours }
            : s,
        ),
      )
    } else {
      await updateMutation.mutateAsync({
        id: session.id,
        babyId: babyId!,
        updates: {
          end_time: endTime.toISOString(),
          duration_hours: durationHours,
        },
      })
    }
    toast.success(t('sleep.ended'))
  }

  const handleDelete = async (id: string) => {
    if (isDemo) {
      setDemoSessions((prev) => prev.filter((s) => s.id !== id))
    } else {
      await deleteMutation.mutateAsync({ id, babyId: babyId! })
    }
    toast.success(t('sleep.deleted'))
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">{t('sleep.title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('sleep.subtitle')}</p>
      </div>

      {/* Active Sleep Banner */}
      {activeSleep && (
        <Card className="border-violet-300 bg-violet-100">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-violet-500" />
              </span>
              <div>
                <p className="text-sm font-semibold text-violet-800">{t('sleep.sleeping')}</p>
                <p className="text-xs text-violet-600">
                  {new Date(activeSleep.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {' — '}
                  {formatElapsed(now - new Date(activeSleep.start_time).getTime())}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-white rounded-full gap-1.5"
              onClick={() => handleWakeUp(activeSleep)}
              disabled={updateMutation.isPending}
            >
              <Sun className="size-4" />
              {t('sleep.wakeUp')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Today's Summary */}
      <Card className="border-[#ddd6fe] bg-violet-50">
        <CardContent className="flex items-center gap-4 p-6">
          <Moon className="h-8 w-8 text-[#a78bfa]" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('sleep.today')}</p>
            <p className={`text-2xl font-bold ${todayTotal >= 14 ? 'text-green-600' : todayTotal >= 12 ? 'text-amber-600' : 'text-red-600'}`}>
              {todayTotal.toFixed(1)} {t('sleep.hours')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Log Form */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="text-lg font-semibold">{t('sleep.log')}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>{t('sleep.startTime')}</Label>
              <Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            {!stillSleeping && (
              <div>
                <Label>{t('sleep.endTime')}</Label>
                <Input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            )}
          </div>
          {/* Still sleeping toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={stillSleeping}
              onChange={(e) => setStillSleeping(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
            />
            <span className="text-sm text-muted-foreground">{t('sleep.stillSleeping')}</span>
          </label>
          {!stillSleeping && (
            <div>
              <Label>{t('sleep.duration')}: <span className="font-bold">{duration.toFixed(1)} {t('sleep.hours')}</span></Label>
            </div>
          )}
          <div>
            <Label>{t('sleep.notes')}</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('sleep.notes')} />
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleAdd}
              disabled={!stillSleeping && duration <= 0}
            >
              {stillSleeping ? t('sleep.startSleep') : t('sleep.add')}
            </Button>
            {!isDemo && (
              <VoiceInputButton
                trackerType="sleep"
                onParsed={(data) => {
                  const d = data as ParsedSleepData
                  if (d.start_time) setStartTime(formatDatetimeLocal(new Date(d.start_time)))
                  if (d.end_time) {
                    setEndTime(formatDatetimeLocal(new Date(d.end_time)))
                    setStillSleeping(false)
                  } else if (d.start_time && !d.end_time) {
                    setStillSleeping(true)
                  }
                  if (d.notes) setNotes(d.notes)
                }}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Analytics */}
      <Card>
        <CardContent className="p-6">
          <h2 className="mb-4 text-lg font-semibold">{t('sleep.analytics')}</h2>
          <Tabs value={period} onValueChange={setPeriod}>
            <TabsList>
              <TabsTrigger value="week">{t('feeding.period.week')}</TabsTrigger>
              <TabsTrigger value="month">{t('feeding.period.month')}</TabsTrigger>
            </TabsList>
            <TabsContent value={period}>
              {chartData.some(d => d.hours > 0) ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData}>
                    <XAxis dataKey="label" fontSize={12} />
                    <YAxis allowDecimals={false} domain={[0, 'auto']} />
                    <Tooltip />
                    <ReferenceLine y={14} stroke="#22c55e" strokeDasharray="3 3" label={{ value: '14h', position: 'right', fontSize: 10 }} />
                    <Bar
                      dataKey="hours"
                      fill="#a78bfa"
                      name={`${t('sleep.total')} (${t('sleep.hours')})`}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-8 text-center text-muted-foreground">{t('common.noData')}</p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardContent className="p-6">
          <h2 className="mb-4 text-lg font-semibold">{t('sleep.history')}</h2>
          {sessions.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground">{t('sleep.empty')}</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => (
                <div key={s.id} className={`flex items-center justify-between rounded-lg border p-3 ${!s.end_time ? 'border-violet-200 bg-violet-50' : ''}`}>
                  <div>
                    <p className="text-sm font-medium">
                      {new Date(s.start_time).toLocaleString()}
                      {s.end_time ? (
                        <> &rarr; {new Date(s.end_time).toLocaleString()}</>
                      ) : (
                        <span className="ml-2 inline-flex items-center gap-1 text-violet-600">
                          <span className="size-1.5 rounded-full bg-violet-500 animate-pulse" />
                          {t('sleep.sleeping')}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {s.end_time && s.duration_hours != null
                        ? `${s.duration_hours.toFixed(1)} ${t('sleep.hours')}`
                        : formatElapsed(now - new Date(s.start_time).getTime())}
                      {s.notes && ` - ${s.notes}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {!s.end_time && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-amber-600 border-amber-200 hover:bg-amber-50"
                        onClick={() => handleWakeUp(s)}
                        disabled={updateMutation.isPending}
                      >
                        <Sun className="size-3.5" />
                        {t('sleep.wakeUp')}
                      </Button>
                    )}
                    {canDelete(s) && (
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sleep Tips */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <h2 className="font-semibold">{t('sleep.tips.title')}</h2>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            <li>{t('sleep.tips.1')}</li>
            <li>{t('sleep.tips.2')}</li>
            <li>{t('sleep.tips.3')}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
