import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Droplets, Trash2, ChevronDown, ChevronUp, Loader2, Snowflake, Refrigerator, Baby } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { useBaby } from '@/contexts/BabyContext'
import { usePumpingSessions, useAddPumping, useDeletePumping } from '@/hooks/usePumpingSessions'
import { useMilkStash, useUseMilkStash, useDeleteMilkStash } from '@/hooks/useMilkStash'
import { useCaregivers } from '@/hooks/useCaregivers'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { queryKeys } from '@/lib/query-keys'
import { VoiceInputButton } from '@/components/voice/VoiceInputButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { PumpingSession, PumpingSide, StorageDestination, BabyCaregiver, ParsedPumpingData } from '@/types'

const SIDES: PumpingSide[] = ['left', 'right', 'both']
const STORAGES: StorageDestination[] = ['fed_immediately', 'fridge', 'freezer']

const SIDE_COLORS: Record<PumpingSide, string> = {
  left: 'bg-pink-100 text-pink-700 border-pink-300',
  right: 'bg-blue-100 text-blue-700 border-blue-300',
  both: 'bg-purple-100 text-purple-700 border-purple-300',
}

const SIDE_ACTIVE: Record<PumpingSide, string> = {
  left: 'bg-pink-500 text-white border-pink-500',
  right: 'bg-blue-500 text-white border-blue-500',
  both: 'bg-purple-500 text-white border-purple-500',
}

const STORAGE_ICONS: Record<StorageDestination, typeof Baby> = {
  fed_immediately: Baby,
  fridge: Refrigerator,
  freezer: Snowflake,
}

function formatDatetimeLocal(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d}T${h}:${min}`
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function daysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

export default function PumpingTrackerPage() {
  const { t } = useLanguage()
  const { user, isDemo } = useAuth()
  const { selectedBaby } = useBaby()
  const babyId = isDemo ? undefined : selectedBaby?.id

  // Demo state
  const [demoSessions, setDemoSessions] = useState<PumpingSession[]>([])
  const [demoStash, setDemoStash] = useState<{ id: string; storage_type: 'fridge' | 'freezer'; volume_ml: number; used_ml: number; stored_at: string }[]>([])

  // DB hooks
  const { data: dbSessions = [] } = usePumpingSessions(babyId)
  const { data: dbStash = [] } = useMilkStash(babyId)
  const addMutation = useAddPumping()
  const deleteMutation = useDeletePumping()
  const useMutation = useUseMilkStash()
  const deleteStashMutation = useDeleteMilkStash()
  const { data: caregivers = [] } = useCaregivers(babyId)

  // Realtime
  useRealtimeSync('pumping_sessions', babyId, queryKeys.pumping.byBaby(babyId ?? ''))
  useRealtimeSync('milk_stash', babyId, queryKeys.milkStash.byBaby(babyId ?? ''))

  const sessions = isDemo ? demoSessions : dbSessions
  const stash = isDemo ? demoStash : dbStash

  const isPrimary = caregivers.some((c: BabyCaregiver) => c.user_id === user?.id && c.role === 'primary')
  const canDelete = (record: PumpingSession) => isDemo || isPrimary || record.caregiver_id === user?.id

  // Form state
  const [time, setTime] = useState(formatDatetimeLocal(new Date()))
  const [duration, setDuration] = useState('')
  const [volume, setVolume] = useState('')
  const [side, setSide] = useState<PumpingSide>('left')
  const [storage, setStorage] = useState<StorageDestination>('fridge')
  const [notes, setNotes] = useState('')
  const [period, setPeriod] = useState('day')
  const [inventoryOpen, setInventoryOpen] = useState(true)

  // Use stash state
  const [usingStashId, setUsingStashId] = useState<string | null>(null)
  const [useAmount, setUseAmount] = useState('')

  // Today's summary
  const todayStats = useMemo(() => {
    const todaySessions = sessions.filter((s) => isToday(s.pumped_at))
    const totalMl = todaySessions.reduce((sum, s) => sum + s.volume_ml, 0)
    const avg = todaySessions.length > 0 ? Math.round(totalMl / todaySessions.length) : 0
    const leftMl = todaySessions.filter((s) => s.side === 'left').reduce((sum, s) => sum + s.volume_ml, 0)
    const rightMl = todaySessions.filter((s) => s.side === 'right').reduce((sum, s) => sum + s.volume_ml, 0)
    const bothMl = todaySessions.filter((s) => s.side === 'both').reduce((sum, s) => sum + s.volume_ml, 0)
    return { count: todaySessions.length, totalMl, avg, leftMl, rightMl, bothMl }
  }, [sessions])

  // Available stash (not fully consumed)
  const availableStash = useMemo(() => {
    return stash.filter((s) => s.volume_ml - s.used_ml > 0).sort((a, b) => new Date(a.stored_at).getTime() - new Date(b.stored_at).getTime())
  }, [stash])

  const totalAvailableMl = useMemo(() => availableStash.reduce((sum, s) => sum + (s.volume_ml - s.used_ml), 0), [availableStash])

  // Chart data
  const chartData = useMemo(() => {
    const now = new Date()
    let filtered: PumpingSession[]
    let bucketFn: (d: Date) => string

    if (period === 'day') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      filtered = sessions.filter((s) => new Date(s.pumped_at) >= startOfDay)
      bucketFn = (d) => `${d.getHours()}:00`
    } else if (period === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      filtered = sessions.filter((s) => new Date(s.pumped_at) >= weekAgo)
      bucketFn = (d) => `${d.getMonth() + 1}/${d.getDate()}`
    } else {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      filtered = sessions.filter((s) => new Date(s.pumped_at) >= monthAgo)
      bucketFn = (d) => `${d.getMonth() + 1}/${d.getDate()}`
    }

    const buckets = new Map<string, { fed_immediately: number; fridge: number; freezer: number }>()
    for (const s of filtered) {
      const key = bucketFn(new Date(s.pumped_at))
      const bucket = buckets.get(key) ?? { fed_immediately: 0, fridge: 0, freezer: 0 }
      bucket[s.storage] += s.volume_ml
      buckets.set(key, bucket)
    }

    return Array.from(buckets.entries()).map(([name, data]) => ({ name, ...data }))
  }, [sessions, period])

  // Handlers
  const handleAdd = async () => {
    if (!volume || parseInt(volume) <= 0) return

    const newTime = new Date(time).getTime()
    const duplicate = sessions.some((s) => Math.abs(newTime - new Date(s.pumped_at).getTime()) < 60_000)
    if (duplicate) {
      toast.warning(t('pumping.overlap'))
      return
    }

    const session = {
      baby_id: babyId ?? '',
      caregiver_id: user?.id ?? '',
      pumped_at: new Date(time).toISOString(),
      duration_minutes: duration ? parseInt(duration) : null,
      volume_ml: parseInt(volume),
      side,
      storage,
      notes: notes || null,
    }

    if (isDemo) {
      const newSession: PumpingSession = { ...session, id: crypto.randomUUID(), created_at: new Date().toISOString() }
      setDemoSessions((prev) => [newSession, ...prev])
      if (storage === 'fridge' || storage === 'freezer') {
        setDemoStash((prev) => [
          { id: crypto.randomUUID(), storage_type: storage, volume_ml: parseInt(volume), used_ml: 0, stored_at: new Date(time).toISOString() },
          ...prev,
        ])
      }
    } else {
      await addMutation.mutateAsync(session)
    }

    toast.success(t('pumping.added'))
    setTime(formatDatetimeLocal(new Date()))
    setDuration('')
    setVolume('')
    setNotes('')
  }

  const handleDelete = async (id: string) => {
    if (isDemo) {
      setDemoSessions((prev) => prev.filter((s) => s.id !== id))
    } else {
      await deleteMutation.mutateAsync({ id, babyId: babyId! })
    }
    toast.success(t('pumping.deleted'))
  }

  const handleUseStash = async (stashId: string) => {
    const amount = parseInt(useAmount)
    if (!amount || amount <= 0) return

    if (isDemo) {
      setDemoStash((prev) => prev.map((s) => (s.id === stashId ? { ...s, used_ml: s.used_ml + amount } : s)))
    } else {
      await useMutation.mutateAsync({ stashId, volumeMl: amount, babyId: babyId! })
    }
    toast.success(t('pumping.inventory.used'))
    setUsingStashId(null)
    setUseAmount('')
  }

  const handleDeleteStash = async (stashId: string) => {
    if (isDemo) {
      setDemoStash((prev) => prev.filter((s) => s.id !== stashId))
    } else {
      await deleteStashMutation.mutateAsync({ id: stashId, babyId: babyId! })
    }
  }

  const handleVoiceParsed = (data: ParsedPumpingData) => {
    if (data.time) setTime(formatDatetimeLocal(new Date(data.time)))
    if (data.duration_minutes != null) setDuration(String(data.duration_minutes))
    if (data.volume_ml != null) setVolume(String(data.volume_ml))
    if (data.side) setSide(data.side)
    if (data.storage) setStorage(data.storage)
    if (data.notes) setNotes(data.notes)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t('pumping.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('pumping.subtitle')}</p>
      </div>

      {/* Demo banner */}
      {isDemo && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">{t('auth.demo.banner')}</p>
          <p className="text-xs">{t('auth.demo.login')}</p>
        </div>
      )}

      {/* Today's Summary */}
      <div className="rounded-2xl border bg-gradient-to-br from-fuchsia-50 to-pink-50 p-5">
        <h3 className="mb-3 text-sm font-bold text-fuchsia-600">{t('pumping.today')}</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-2xl font-black">{todayStats.totalMl}<span className="ml-1 text-sm font-bold text-fuchsia-400">{t('pumping.ml')}</span></p>
            <p className="text-xs text-muted-foreground">{t('pumping.total')}</p>
          </div>
          <div>
            <p className="text-2xl font-black">{todayStats.avg}<span className="ml-1 text-sm font-bold text-fuchsia-400">{t('pumping.ml')}</span></p>
            <p className="text-xs text-muted-foreground">{t('pumping.average')}</p>
          </div>
          <div>
            <p className="text-2xl font-black">{todayStats.count}</p>
            <p className="text-xs text-muted-foreground">{t('pumping.count')}</p>
          </div>
        </div>
        {todayStats.count > 0 && (
          <div className="mt-3 flex gap-2">
            <span className="rounded-full bg-pink-200 px-2 py-0.5 text-xs font-medium text-pink-700">L: {todayStats.leftMl}ml</span>
            <span className="rounded-full bg-blue-200 px-2 py-0.5 text-xs font-medium text-blue-700">R: {todayStats.rightMl}ml</span>
            <span className="rounded-full bg-purple-200 px-2 py-0.5 text-xs font-medium text-purple-700">B: {todayStats.bothMl}ml</span>
          </div>
        )}
      </div>

      {/* Log Form */}
      <div className="space-y-4 rounded-2xl border p-5">
        <h3 className="font-bold">{t('pumping.log')}</h3>

        <div>
          <label className="mb-1 block text-sm font-medium">{t('pumping.time')}</label>
          <Input type="datetime-local" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">{t('pumping.duration')}</label>
            <Input type="number" placeholder={t('pumping.min')} value={duration} onChange={(e) => setDuration(e.target.value)} min="0" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t('pumping.volume')} *</label>
            <Input type="number" placeholder={t('pumping.ml')} value={volume} onChange={(e) => setVolume(e.target.value)} min="1" required />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">{t('pumping.side')}</label>
          <div className="flex gap-2">
            {SIDES.map((s) => (
              <Button
                key={s}
                type="button"
                variant="outline"
                size="sm"
                className={`flex-1 ${side === s ? SIDE_ACTIVE[s] : SIDE_COLORS[s]}`}
                onClick={() => setSide(s)}
              >
                {t(`pumping.side.${s}` as const)}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">{t('pumping.storage')}</label>
          <div className="flex gap-2">
            {STORAGES.map((s) => {
              const Icon = STORAGE_ICONS[s]
              return (
                <Button
                  key={s}
                  type="button"
                  variant="outline"
                  size="sm"
                  className={`flex-1 gap-1 ${storage === s ? 'bg-fuchsia-500 text-white border-fuchsia-500' : ''}`}
                  onClick={() => setStorage(s)}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t(`pumping.storage.${s}` as const)}</span>
                </Button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">{t('pumping.notes')}</label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('pumping.notes')} />
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleAdd} disabled={!volume || addMutation.isPending} className="flex-1 bg-fuchsia-600 hover:bg-fuchsia-700">
            {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Droplets className="h-4 w-4" />}
            {t('pumping.add')}
          </Button>
          {!isDemo && (
            <VoiceInputButton
              trackerType="pumping"
              onParsed={(data) => handleVoiceParsed(data as ParsedPumpingData)}
            />
          )}
        </div>
      </div>

      {/* Milk Inventory */}
      <Collapsible open={inventoryOpen} onOpenChange={setInventoryOpen}>
        <div className="rounded-2xl border bg-gradient-to-br from-teal-50 to-emerald-50 p-5">
          <CollapsibleTrigger asChild>
            <button className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-teal-700">{t('pumping.inventory')}</h3>
                <span className="rounded-full bg-teal-200 px-2 py-0.5 text-xs font-bold text-teal-700">
                  {totalAvailableMl} {t('pumping.ml')}
                </span>
              </div>
              {inventoryOpen ? <ChevronUp className="h-4 w-4 text-teal-600" /> : <ChevronDown className="h-4 w-4 text-teal-600" />}
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            {availableStash.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t('pumping.inventory.empty')}</p>
            ) : (
              <div className="mt-3 space-y-2">
                {/* Fridge section */}
                {availableStash.filter((s) => s.storage_type === 'fridge').length > 0 && (
                  <div>
                    <p className="mb-1 flex items-center gap-1 text-xs font-bold text-teal-600">
                      <Refrigerator className="h-3 w-3" /> {t('pumping.inventory.fridge')}
                    </p>
                    {availableStash
                      .filter((s) => s.storage_type === 'fridge')
                      .map((item) => {
                        const remaining = item.volume_ml - item.used_ml
                        const age = daysAgo(item.stored_at)
                        const isWarning = age >= 3
                        const isDanger = age >= 4
                        return (
                          <div key={item.id} className="flex items-center gap-2 rounded-lg bg-white/60 p-2">
                            <div className="flex-1">
                              <span className="font-bold">{remaining}<span className="text-xs font-normal text-muted-foreground">/{item.volume_ml} {t('pumping.ml')}</span></span>
                              <span className={`ml-2 text-xs ${isDanger ? 'text-red-600 font-bold' : isWarning ? 'text-amber-600' : 'text-muted-foreground'}`}>
                                {age}d
                                {isDanger && ' ⚠️'}
                              </span>
                            </div>
                            {usingStashId === item.id ? (
                              <div className="flex items-center gap-1">
                                <Input type="number" className="h-7 w-20 text-xs" placeholder={t('pumping.ml')} value={useAmount} onChange={(e) => setUseAmount(e.target.value)} min="1" max={remaining} />
                                <Button size="sm" className="h-7 bg-teal-600 text-xs" onClick={() => handleUseStash(item.id)}>{t('pumping.inventory.use')}</Button>
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setUsingStashId(null); setUseAmount('') }}>✕</Button>
                              </div>
                            ) : (
                              <div className="flex gap-1">
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setUsingStashId(item.id); setUseAmount(String(remaining)) }}>
                                  {t('pumping.inventory.use')}
                                </Button>
                                {(isDemo || isPrimary) && (
                                  <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500" onClick={() => handleDeleteStash(item.id)}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                  </div>
                )}

                {/* Freezer section */}
                {availableStash.filter((s) => s.storage_type === 'freezer').length > 0 && (
                  <div>
                    <p className="mb-1 flex items-center gap-1 text-xs font-bold text-teal-600">
                      <Snowflake className="h-3 w-3" /> {t('pumping.inventory.freezer')}
                    </p>
                    {availableStash
                      .filter((s) => s.storage_type === 'freezer')
                      .map((item) => {
                        const remaining = item.volume_ml - item.used_ml
                        const age = daysAgo(item.stored_at)
                        const isWarning = age >= 150
                        const isDanger = age >= 180
                        return (
                          <div key={item.id} className="flex items-center gap-2 rounded-lg bg-white/60 p-2">
                            <div className="flex-1">
                              <span className="font-bold">{remaining}<span className="text-xs font-normal text-muted-foreground">/{item.volume_ml} {t('pumping.ml')}</span></span>
                              <span className={`ml-2 text-xs ${isDanger ? 'text-red-600 font-bold' : isWarning ? 'text-amber-600' : 'text-muted-foreground'}`}>
                                {age}d
                                {isDanger && ' ⚠️'}
                              </span>
                            </div>
                            {usingStashId === item.id ? (
                              <div className="flex items-center gap-1">
                                <Input type="number" className="h-7 w-20 text-xs" placeholder={t('pumping.ml')} value={useAmount} onChange={(e) => setUseAmount(e.target.value)} min="1" max={remaining} />
                                <Button size="sm" className="h-7 bg-teal-600 text-xs" onClick={() => handleUseStash(item.id)}>{t('pumping.inventory.use')}</Button>
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setUsingStashId(null); setUseAmount('') }}>✕</Button>
                              </div>
                            ) : (
                              <div className="flex gap-1">
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setUsingStashId(item.id); setUseAmount(String(remaining)) }}>
                                  {t('pumping.inventory.use')}
                                </Button>
                                {(isDemo || isPrimary) && (
                                  <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500" onClick={() => handleDeleteStash(item.id)}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>
            )}
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Analytics */}
      {sessions.length > 0 && (
        <div className="space-y-3 rounded-2xl border p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">{t('pumping.analytics')}</h3>
            <Tabs value={period} onValueChange={setPeriod}>
              <TabsList className="h-8">
                <TabsTrigger value="day" className="text-xs">{t('pumping.period.day')}</TabsTrigger>
                <TabsTrigger value="week" className="text-xs">{t('pumping.period.week')}</TabsTrigger>
                <TabsTrigger value="month" className="text-xs">{t('pumping.period.month')}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(value: number | string | undefined) => [`${value ?? 0} mL`]}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="fed_immediately" stackId="a" fill="#f0abfc" name={t('pumping.storage.fed_immediately')} radius={[0, 0, 0, 0]} />
              <Bar dataKey="fridge" stackId="a" fill="#5eead4" name={t('pumping.storage.fridge')} radius={[0, 0, 0, 0]} />
              <Bar dataKey="freezer" stackId="a" fill="#93c5fd" name={t('pumping.storage.freezer')} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* History */}
      <div className="space-y-3 rounded-2xl border p-5">
        <h3 className="font-bold">{t('pumping.history')}</h3>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('pumping.empty')}</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{formatTime(s.pumped_at)}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(s.pumped_at)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SIDE_COLORS[s.side]}`}>
                      {t(`pumping.side.${s.side}` as const)}
                    </span>
                    <span className="font-bold text-fuchsia-600">{s.volume_ml} {t('pumping.ml')}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                      {t(`pumping.storage.${s.storage}` as const)}
                    </span>
                    {s.duration_minutes && (
                      <span className="text-xs text-muted-foreground">{s.duration_minutes} {t('pumping.min')}</span>
                    )}
                  </div>
                  {s.notes && <p className="mt-1 text-xs text-muted-foreground">{s.notes}</p>}
                </div>
                {canDelete(s) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-700"
                    onClick={() => handleDelete(s.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
