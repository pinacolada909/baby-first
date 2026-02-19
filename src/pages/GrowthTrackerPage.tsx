import { useState, useMemo } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { useBaby } from '@/contexts/BabyContext'
import { useGrowthRecords, useAddGrowthRecord, useDeleteGrowthRecord } from '@/hooks/useGrowthRecords'
import { useMilestones, useToggleMilestone } from '@/hooks/useMilestones'
import { useCaregivers } from '@/hooks/useCaregivers'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { queryKeys } from '@/lib/query-keys'
import { MILESTONE_GROUPS, CATEGORY_STYLES } from '@/data/milestones'
import type { GrowthRecord, BabyCaregiver, MilestoneRecord, ParsedGrowthData } from '@/types'
import { VoiceInputButton } from '@/components/voice/VoiceInputButton'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Ruler, Trash2, Heart, Eye, PersonStanding, Ear, Hand, MessageCircle, Smile, Laugh, Dumbbell, RotateCw, Armchair, Search, Utensils, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

// Icon map for milestone cards — static, no need to recreate per render
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Eye, PersonStanding, Ear, Hand, Smile, MessageCircle, Laugh, Dumbbell,
  RotateCw, Armchair, Search, Utensils, ShieldAlert,
}

function formatDateLocal(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function GrowthTrackerPage() {
  const { t } = useLanguage()
  const { user, isDemo } = useAuth()
  const { selectedBaby } = useBaby()
  const babyId = isDemo ? undefined : selectedBaby?.id

  const { data: dbRecords = [] } = useGrowthRecords(babyId)
  const { data: dbMilestones = [] } = useMilestones(babyId)
  const { data: caregivers = [] } = useCaregivers(babyId)
  const addMutation = useAddGrowthRecord()
  const deleteMutation = useDeleteGrowthRecord()
  const toggleMilestone = useToggleMilestone()
  useRealtimeSync('growth_records', babyId, queryKeys.growth.byBaby(babyId ?? ''))
  useRealtimeSync('milestones', babyId, queryKeys.milestones.byBaby(babyId ?? ''))

  const isPrimary = caregivers.some(
    (c: BabyCaregiver) => c.user_id === user?.id && c.role === 'primary',
  )
  const canDelete = (record: GrowthRecord) =>
    isDemo || isPrimary || record.caregiver_id === user?.id

  // Demo state
  const [demoRecords, setDemoRecords] = useState<GrowthRecord[]>([])
  const [demoMilestones, setDemoMilestones] = useState<MilestoneRecord[]>([])
  const records = isDemo ? demoRecords : dbRecords
  const milestones = isDemo ? demoMilestones : dbMilestones

  // Form state
  const [date, setDate] = useState(formatDateLocal(new Date()))
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [head, setHead] = useState('')
  const [notes, setNotes] = useState('')
  const [chartPeriod, setChartPeriod] = useState('3m')
  const [milestoneTab, setMilestoneTab] = useState(0)
  const [togglingKeys, setTogglingKeys] = useState<Set<string>>(new Set())

  // Latest measurement
  const latest = records.length > 0 ? records[0] : null

  // Chart data — deduplicate by date, keeping the latest entry per day
  const chartData = useMemo(() => {
    const now = new Date()
    let startDate: Date
    if (chartPeriod === '1m') {
      startDate = new Date(now.getTime() - 30 * 86400000)
    } else if (chartPeriod === '3m') {
      startDate = new Date(now.getTime() - 90 * 86400000)
    } else {
      startDate = new Date(now.getTime() - 180 * 86400000)
    }
    const filtered = records
      .filter((r) => new Date(r.measured_at) >= startDate)
      .sort((a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime())

    // Keep only the latest record per calendar date
    const byDate = new Map<string, typeof filtered[0]>()
    for (const r of filtered) {
      const d = new Date(r.measured_at)
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
      byDate.set(key, r) // later entry overwrites earlier one
    }

    return Array.from(byDate.values()).map((r) => {
      const d = new Date(r.measured_at)
      return {
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        weight: r.weight_kg,
        height: r.height_cm,
        head: r.head_cm,
      }
    })
  }, [records, chartPeriod])

  // Milestone lookup
  const achievedKeys = useMemo(
    () => new Set(milestones.map((m) => m.milestone_key)),
    [milestones],
  )

  const handleAdd = async () => {
    if (!weight && !height && !head) {
      toast.error(t('common.error'))
      return
    }

    const w = weight ? parseFloat(weight) : null
    const h = height ? parseFloat(height) : null
    const hc = head ? parseFloat(head) : null

    // Guard against NaN from bad input
    if ((w != null && isNaN(w)) || (h != null && isNaN(h)) || (hc != null && isNaN(hc))) {
      toast.error(t('common.error'))
      return
    }

    const record = {
      baby_id: babyId ?? 'demo',
      caregiver_id: user?.id ?? 'demo',
      measured_at: new Date(date).toISOString(),
      weight_kg: w,
      height_cm: h,
      head_cm: hc,
      notes: notes || null,
    }

    try {
      if (isDemo) {
        setDemoRecords((prev) => [
          { ...record, id: crypto.randomUUID(), created_at: new Date().toISOString() },
          ...prev,
        ])
      } else {
        await addMutation.mutateAsync(record)
      }
      setWeight('')
      setHeight('')
      setHead('')
      setNotes('')
      setDate(formatDateLocal(new Date()))
      toast.success(t('growth.added'))
    } catch {
      toast.error(t('common.error'))
    }
  }

  const handleDelete = async (id: string) => {
    try {
      if (isDemo) {
        setDemoRecords((prev) => prev.filter((r) => r.id !== id))
      } else {
        await deleteMutation.mutateAsync({ id, babyId: babyId! })
      }
      toast.success(t('growth.deleted'))
    } catch {
      toast.error(t('common.error'))
    }
  }

  const handleToggleMilestone = async (key: string, currentlyAchieved: boolean) => {
    if (togglingKeys.has(key)) return // prevent double-click race
    setTogglingKeys((prev) => new Set(prev).add(key))
    try {
      if (isDemo) {
        if (currentlyAchieved) {
          setDemoMilestones((prev) => prev.filter((m) => m.milestone_key !== key))
        } else {
          setDemoMilestones((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              baby_id: 'demo',
              milestone_key: key,
              achieved_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            },
          ])
        }
      } else {
        await toggleMilestone.mutateAsync({
          babyId: babyId!,
          milestoneKey: key,
          achieved: !currentlyAchieved,
        })
      }
    } catch {
      toast.error(t('common.error'))
    } finally {
      setTogglingKeys((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">{t('growth.title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('growth.subtitle')}</p>
      </div>

      {/* Latest Measurements */}
      <Card className="border-teal-200 bg-teal-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Ruler className="h-8 w-8 text-teal-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">{t('growth.latest')}</p>
              {latest ? (
                <div className="mt-1 grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xl font-bold text-teal-700">
                      {latest.weight_kg != null ? `${latest.weight_kg}` : '-'}
                    </p>
                    <p className="text-xs text-muted-foreground">{t('growth.kg')}</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-teal-700">
                      {latest.height_cm != null ? `${latest.height_cm}` : '-'}
                    </p>
                    <p className="text-xs text-muted-foreground">{t('growth.cm')}</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-teal-700">
                      {latest.head_cm != null ? `${latest.head_cm}` : '-'}
                    </p>
                    <p className="text-xs text-muted-foreground">{t('growth.cm')}</p>
                  </div>
                </div>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">{t('growth.empty')}</p>
              )}
              {latest && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(latest.measured_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Log Form */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="text-lg font-semibold">{t('growth.log')}</h2>
          <div>
            <Label>{t('growth.date')}</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>{t('growth.weight')}</Label>
              <Input
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="kg"
              />
            </div>
            <div>
              <Label>{t('growth.height')}</Label>
              <Input
                type="number"
                step="0.1"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="cm"
              />
            </div>
            <div>
              <Label>{t('growth.head')}</Label>
              <Input
                type="number"
                step="0.1"
                value={head}
                onChange={(e) => setHead(e.target.value)}
                placeholder="cm"
              />
            </div>
          </div>
          <div>
            <Label>{t('growth.notes')}</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('growth.notes')} />
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleAdd}>{t('growth.add')}</Button>
            {!isDemo && (
              <VoiceInputButton
                trackerType="growth"
                onParsed={(data) => {
                  const d = data as ParsedGrowthData
                  if (d.date) setDate(formatDateLocal(new Date(d.date)))
                  if (d.weight_kg != null) setWeight(String(d.weight_kg))
                  if (d.height_cm != null) setHeight(String(d.height_cm))
                  if (d.head_cm != null) setHead(String(d.head_cm))
                  if (d.notes) setNotes(d.notes)
                }}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Growth Charts */}
      <Card>
        <CardContent className="p-6">
          <h2 className="mb-4 text-lg font-semibold">{t('growth.chart')}</h2>
          <Tabs value={chartPeriod} onValueChange={setChartPeriod}>
            <TabsList>
              <TabsTrigger value="1m">{t('growth.period.1m')}</TabsTrigger>
              <TabsTrigger value="3m">{t('growth.period.3m')}</TabsTrigger>
              <TabsTrigger value="6m">{t('growth.period.6m')}</TabsTrigger>
            </TabsList>
            <TabsContent value={chartPeriod}>
              {chartData.length > 0 ? (
                <div className="space-y-6">
                  {/* Weight Chart */}
                  {chartData.some((d) => d.weight != null) && (
                    <div>
                      <h3 className="mb-2 text-sm font-medium text-teal-600">{t('growth.weight')}</h3>
                      <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={chartData}>
                          <XAxis dataKey="label" fontSize={12} />
                          <YAxis fontSize={12} domain={['auto', 'auto']} unit=" kg" width={55} />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="weight"
                            stroke="#14b8a6"
                            strokeWidth={2}
                            name={t('growth.weight')}
                            connectNulls
                            dot={{ r: 4, fill: '#14b8a6' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Height Chart */}
                  {chartData.some((d) => d.height != null) && (
                    <div>
                      <h3 className="mb-2 text-sm font-medium text-amber-600">{t('growth.height')}</h3>
                      <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={chartData}>
                          <XAxis dataKey="label" fontSize={12} />
                          <YAxis fontSize={12} domain={['auto', 'auto']} unit=" cm" width={55} />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="height"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            name={t('growth.height')}
                            connectNulls
                            dot={{ r: 4, fill: '#f59e0b' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Head Circumference Chart */}
                  {chartData.some((d) => d.head != null) && (
                    <div>
                      <h3 className="mb-2 text-sm font-medium text-violet-600">{t('growth.head')}</h3>
                      <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={chartData}>
                          <XAxis dataKey="label" fontSize={12} />
                          <YAxis fontSize={12} domain={['auto', 'auto']} unit=" cm" width={55} />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="head"
                            stroke="#8b5cf6"
                            strokeWidth={2}
                            name={t('growth.head')}
                            connectNulls
                            dot={{ r: 4, fill: '#8b5cf6' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              ) : (
                <p className="py-8 text-center text-muted-foreground">{t('common.noData')}</p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Milestone Board */}
      <div>
        <h2 className="text-lg font-semibold">{t('growth.milestones')}</h2>
        <p className="mb-4 text-sm text-muted-foreground">{t('growth.milestones.subtitle')}</p>

        {/* Month tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {MILESTONE_GROUPS.map((group, idx) => (
            <button
              key={group.titleKey}
              type="button"
              onClick={() => setMilestoneTab(idx)}
              className={`whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                milestoneTab === idx
                  ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/20'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t(group.titleKey)}
            </button>
          ))}
        </div>

        {/* Milestone cards grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {MILESTONE_GROUPS[milestoneTab].milestones.map((ms) => {
            const achieved = achievedKeys.has(ms.key)
            const style = CATEGORY_STYLES[ms.category]
            const IconComponent = ICON_MAP[ms.icon]
            return (
              <button
                key={ms.key}
                type="button"
                onClick={() => {
                  handleToggleMilestone(ms.key, achieved)
                  if (!achieved) toast.success(t('milestone.completed'))
                }}
                className={`group relative cursor-pointer overflow-hidden rounded-xl border-2 p-5 text-left transition-all hover:-translate-y-1 ${
                  achieved
                    ? 'border-violet-400 bg-violet-500 text-white'
                    : `border-transparent ${style.bg} hover:border-violet-300`
                }`}
              >
                {/* Icon */}
                <div
                  className={`mb-3 flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm transition-transform group-hover:scale-110 ${
                    achieved ? 'bg-white/20 text-white' : `${style.iconBg} ${style.iconText}`
                  }`}
                >
                  {IconComponent && <IconComponent className="h-5 w-5" />}
                </div>

                {/* Title */}
                <h3 className="mb-1 text-base font-bold">{t(ms.labelKey)}</h3>

                {/* Description */}
                <p className={`mb-4 text-sm ${achieved ? 'opacity-80' : 'opacity-70'}`}>
                  {t(ms.descKey)}
                </p>

                {/* Footer: category tag + heart */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      achieved ? 'opacity-60' : 'opacity-50'
                    }`}
                  >
                    {t(style.tagKey)}
                  </span>
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors ${
                      achieved
                        ? 'border-white/50 bg-white text-violet-500'
                        : 'border-slate-200'
                    }`}
                  >
                    <Heart className={`h-3.5 w-3.5 ${achieved ? 'fill-current' : ''}`} />
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Progress bar */}
        {(() => {
          const group = MILESTONE_GROUPS[milestoneTab]
          const total = group.milestones.length
          const done = group.milestones.filter((ms) => achievedKeys.has(ms.key)).length
          const pct = Math.round((done / total) * 100)
          const remaining = total - done
          return (
            <Card className="mt-6">
              <CardContent className="p-5">
                <h3 className="mb-3 text-sm font-bold">{t('milestone.progress')}</h3>
                <div className="mb-1 flex justify-between text-xs font-medium">
                  <span>{t(group.titleKey)}</span>
                  <span className="text-violet-500">{pct}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-violet-500 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-2 text-center text-[11px] text-slate-400">
                  {remaining > 0
                    ? `${remaining} ${t('milestone.progress.left')}`
                    : t('milestone.progress.done')}
                </p>
              </CardContent>
            </Card>
          )
        })()}
      </div>

      {/* History */}
      <Card>
        <CardContent className="p-6">
          <h2 className="mb-4 text-lg font-semibold">{t('growth.history')}</h2>
          {records.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground">{t('growth.empty')}</p>
          ) : (
            <div className="space-y-2">
              {records.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">
                      {new Date(r.measured_at).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.weight_kg != null && `${r.weight_kg} ${t('growth.kg')}`}
                      {r.weight_kg != null && (r.height_cm != null || r.head_cm != null) && ' · '}
                      {r.height_cm != null && `${r.height_cm} ${t('growth.cm')}`}
                      {r.height_cm != null && r.head_cm != null && ' · '}
                      {r.head_cm != null && `${t('growth.head.short')} ${r.head_cm} ${t('growth.cm')}`}
                      {r.notes ? ` — ${r.notes}` : ''}
                    </p>
                  </div>
                  {canDelete(r) && (
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}>
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
