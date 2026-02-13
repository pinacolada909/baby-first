import { useState, useMemo } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { useBaby } from '@/contexts/BabyContext'
import { useSleepSessions, useAddSleep, useDeleteSleep } from '@/hooks/useSleepSessions'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { queryKeys } from '@/lib/query-keys'
import type { SleepSession } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Moon, Trash2, Lightbulb } from 'lucide-react'
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

export function SleepTrackerPage() {
  const { t } = useLanguage()
  const { user, isDemo } = useAuth()
  const { selectedBaby } = useBaby()
  const babyId = isDemo ? undefined : selectedBaby?.id

  // DB hooks
  const { data: dbSessions = [] } = useSleepSessions(babyId)
  const addMutation = useAddSleep()
  const deleteMutation = useDeleteSleep()
  useRealtimeSync('sleep_sessions', babyId, queryKeys.sleep.byBaby(babyId ?? ''))

  // Demo state
  const [demoSessions, setDemoSessions] = useState<SleepSession[]>([])

  const sessions = isDemo ? demoSessions : dbSessions

  // Form state
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 3600000)
  const [startTime, setStartTime] = useState(formatDatetimeLocal(oneHourAgo))
  const [endTime, setEndTime] = useState(formatDatetimeLocal(now))
  const [notes, setNotes] = useState('')
  const [period, setPeriod] = useState('week')

  const duration = useMemo(() => {
    const start = new Date(startTime)
    const end = new Date(endTime)
    let diff = (end.getTime() - start.getTime()) / 3600000
    if (diff < 0) diff += 24
    return Math.round(diff * 100) / 100
  }, [startTime, endTime])

  const todayTotal = useMemo(() => {
    return sessions
      .filter((s) => isToday(s.start_time))
      .reduce((sum, s) => sum + s.duration_hours, 0)
  }, [sessions])

  const chartData = useMemo(() => {
    const now = new Date()
    let days: number
    if (period === 'week') {
      days = 7
    } else {
      days = 30
    }

    // Create buckets for each day
    const buckets: Record<string, { label: string; hours: number; date: Date }> = {}
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 86400000)
      const label = `${date.getMonth() + 1}/${date.getDate()}`
      buckets[label] = { label, hours: 0, date }
    }

    // Sum sleep hours per day
    sessions.forEach((s) => {
      const d = new Date(s.start_time)
      const label = `${d.getMonth() + 1}/${d.getDate()}`
      if (buckets[label]) {
        buckets[label].hours += s.duration_hours
      }
    })

    // Sort by date and return
    return Object.values(buckets)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(({ label, hours }) => ({ label, hours: Math.round(hours * 10) / 10 }))
  }, [sessions, period])

  const handleAdd = async () => {
    const session = {
      baby_id: babyId ?? 'demo',
      caregiver_id: user?.id ?? 'demo',
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      duration_hours: duration,
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
    toast.success(t('sleep.added'))
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
            <div>
              <Label>{t('sleep.endTime')}</Label>
              <Input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>{t('sleep.duration')}: <span className="font-bold">{duration.toFixed(1)} {t('sleep.hours')}</span></Label>
          </div>
          <div>
            <Label>{t('sleep.notes')}</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('sleep.notes')} />
          </div>
          <Button onClick={handleAdd} disabled={duration <= 0}>
            {t('sleep.add')}
          </Button>
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
                <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">
                      {new Date(s.start_time).toLocaleString()} &rarr; {new Date(s.end_time).toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {s.duration_hours.toFixed(1)} {t('sleep.hours')}
                      {s.notes && ` - ${s.notes}`}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
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
