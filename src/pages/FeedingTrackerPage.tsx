import { useState, useMemo } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { useBaby } from '@/contexts/BabyContext'
import { useFeedings, useAddFeeding, useDeleteFeeding } from '@/hooks/useFeedings'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { queryKeys } from '@/lib/query-keys'
import type { Feeding, FeedingType } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Utensils, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

function formatDatetimeLocal(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function isToday(dateStr: string): boolean {
  return new Date(dateStr).toDateString() === new Date().toDateString()
}

const TYPE_COLORS: Record<FeedingType, string> = {
  breastmilk: 'bg-pink-100 text-pink-700 border-pink-300',
  formula: 'bg-blue-100 text-blue-700 border-blue-300',
  ready_to_feed: 'bg-green-100 text-green-700 border-green-300',
}

const FEEDING_TYPES: FeedingType[] = ['breastmilk', 'formula', 'ready_to_feed']

export function FeedingTrackerPage() {
  const { t } = useLanguage()
  const { user, isDemo } = useAuth()
  const { selectedBaby } = useBaby()
  const babyId = isDemo ? undefined : selectedBaby?.id

  const { data: dbFeedings = [] } = useFeedings(babyId)
  const addMutation = useAddFeeding()
  const deleteMutation = useDeleteFeeding()
  useRealtimeSync('feedings', babyId, queryKeys.feeding.byBaby(babyId ?? ''))

  const [demoFeedings, setDemoFeedings] = useState<Feeding[]>([])
  const feedings = isDemo ? demoFeedings : dbFeedings

  const [time, setTime] = useState(formatDatetimeLocal(new Date()))
  const [feedingType, setFeedingType] = useState<FeedingType>('breastmilk')
  const [volume, setVolume] = useState('')
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [period, setPeriod] = useState('day')

  const todayFeedings = useMemo(() => feedings.filter((f) => isToday(f.fed_at)), [feedings])
  const todayTotal = useMemo(() => todayFeedings.reduce((s, f) => s + (f.volume_ml ?? 0), 0), [todayFeedings])
  const todayAvg = useMemo(() => {
    const withVolume = todayFeedings.filter((f) => f.volume_ml)
    return withVolume.length > 0 ? todayTotal / withVolume.length : 0
  }, [todayFeedings, todayTotal])

  const chartData = useMemo(() => {
    const now = new Date()
    let startDate: Date
    if (period === 'day') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (period === 'week') {
      startDate = new Date(now.getTime() - 7 * 86400000)
    } else {
      startDate = new Date(now.getTime() - 30 * 86400000)
    }
    const filtered = feedings.filter((f) => new Date(f.fed_at) >= startDate)
    const buckets: Record<string, { label: string; volume: number }> = {}

    filtered.forEach((f) => {
      const d = new Date(f.fed_at)
      const label = period === 'day'
        ? `${d.getHours()}:00`
        : `${d.getMonth() + 1}/${d.getDate()}`
      if (!buckets[label]) buckets[label] = { label, volume: 0 }
      // Sum volume in mL
      buckets[label].volume += f.volume_ml ?? 0
    })
    // Sort by time - for day view, sort numerically by hour
    return Object.values(buckets).sort((a, b) => {
      if (period === 'day') {
        return parseInt(a.label) - parseInt(b.label)
      }
      return a.label.localeCompare(b.label)
    })
  }, [feedings, period])

  const typeTranslation = (ft: FeedingType) => t(`feeding.type.${ft}` as `feeding.type.${'breastmilk' | 'formula' | 'ready_to_feed'}`)

  const handleAdd = async () => {
    const feeding = {
      baby_id: babyId ?? 'demo',
      caregiver_id: user?.id ?? 'demo',
      fed_at: new Date(time).toISOString(),
      feeding_type: feedingType,
      volume_ml: volume ? parseInt(volume) : null,
      duration_minutes: duration ? parseInt(duration) : null,
      notes: notes || null,
    }

    if (isDemo) {
      setDemoFeedings((prev) => [
        { ...feeding, id: crypto.randomUUID(), created_at: new Date().toISOString() },
        ...prev,
      ])
    } else {
      await addMutation.mutateAsync(feeding)
    }
    setNotes('')
    setVolume('')
    setDuration('')
    setTime(formatDatetimeLocal(new Date()))
    toast.success(t('feeding.added'))
  }

  const handleDelete = async (id: string) => {
    if (isDemo) {
      setDemoFeedings((prev) => prev.filter((f) => f.id !== id))
    } else {
      await deleteMutation.mutateAsync({ id, babyId: babyId! })
    }
    toast.success(t('feeding.deleted'))
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">{t('feeding.title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('feeding.subtitle')}</p>
      </div>

      {/* Today's Summary */}
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Utensils className="h-8 w-8 text-orange-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">{t('feeding.today')}</p>
              <div className="mt-1 grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xl font-bold text-orange-700">{todayTotal} {t('feeding.ml')}</p>
                  <p className="text-xs text-muted-foreground">{t('feeding.total')}</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-orange-700">{Math.round(todayAvg)} {t('feeding.ml')}</p>
                  <p className="text-xs text-muted-foreground">{t('feeding.average')}</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-orange-700">{todayFeedings.length}</p>
                  <p className="text-xs text-muted-foreground">{t('feeding.count')}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Log Form */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="text-lg font-semibold">{t('feeding.log')}</h2>
          <div>
            <Label>{t('feeding.time')}</Label>
            <Input type="datetime-local" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div>
            <Label>{t('feeding.type')}</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {FEEDING_TYPES.map((ft) => (
                <Button
                  key={ft}
                  variant={feedingType === ft ? 'default' : 'outline'}
                  size="sm"
                  className={feedingType === ft ? '' : TYPE_COLORS[ft]}
                  onClick={() => setFeedingType(ft)}
                >
                  {typeTranslation(ft)}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <Label>{t('feeding.volume')}</Label>
            <Input type="number" value={volume} onChange={(e) => setVolume(e.target.value)} placeholder="mL" />
          </div>
          {feedingType === 'breastmilk' && (
            <div>
              <Label>{t('feeding.duration')}</Label>
              <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="min" />
            </div>
          )}
          <div>
            <Label>{t('feeding.notes')}</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('feeding.notes')} />
          </div>
          <Button onClick={handleAdd}>{t('feeding.add')}</Button>
        </CardContent>
      </Card>

      {/* Analytics */}
      <Card>
        <CardContent className="p-6">
          <h2 className="mb-4 text-lg font-semibold">{t('feeding.analytics')}</h2>
          <Tabs value={period} onValueChange={setPeriod}>
            <TabsList>
              <TabsTrigger value="day">{t('feeding.period.day')}</TabsTrigger>
              <TabsTrigger value="week">{t('feeding.period.week')}</TabsTrigger>
              <TabsTrigger value="month">{t('feeding.period.month')}</TabsTrigger>
            </TabsList>
            <TabsContent value={period}>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData}>
                    <XAxis dataKey="label" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="volume" fill="#f97316" name={`${t('feeding.total')} (${t('feeding.ml')})`} />
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
          <h2 className="mb-4 text-lg font-semibold">{t('feeding.history')}</h2>
          {feedings.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground">{t('feeding.empty')}</p>
          ) : (
            <div className="space-y-2">
              {feedings.map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={TYPE_COLORS[f.feeding_type]}>
                      {typeTranslation(f.feeding_type)}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">{new Date(f.fed_at).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {f.volume_ml ? `${f.volume_ml} ${t('feeding.ml')}` : ''}
                        {f.duration_minutes ? `${f.duration_minutes} ${t('feeding.min')}` : ''}
                        {f.notes ? ` - ${f.notes}` : ''}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(f.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
