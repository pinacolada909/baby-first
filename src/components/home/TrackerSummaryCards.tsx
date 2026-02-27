import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '@/contexts/LanguageContext'
import { useSleepSessions } from '@/hooks/useSleepSessions'
import { useFeedings } from '@/hooks/useFeedings'
import { useDiaperChanges } from '@/hooks/useDiaperChanges'
import { useGrowthRecords } from '@/hooks/useGrowthRecords'
import { usePumpingSessions } from '@/hooks/usePumpingSessions'
import { Moon, Utensils, Sparkles, Ruler, Droplets, TrendingUp } from 'lucide-react'

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

function formatTimeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  if (diffMs < 0) return ''
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return '<1m'
  if (diffMin < 60) return `${diffMin}m`
  const hours = Math.floor(diffMin / 60)
  const mins = diffMin % 60
  if (hours < 24) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

interface TrackerSummaryCardsProps {
  babyId: string
}

export function TrackerSummaryCards({ babyId }: TrackerSummaryCardsProps) {
  const { t } = useLanguage()
  const navigate = useNavigate()

  const { data: sleepSessions = [] } = useSleepSessions(babyId)
  const { data: feedings = [] } = useFeedings(babyId)
  const { data: diaperChanges = [] } = useDiaperChanges(babyId)
  const { data: growthRecords = [] } = useGrowthRecords(babyId)
  const { data: pumpingSessions = [] } = usePumpingSessions(babyId)

  // Sleep stats
  const sleepStats = useMemo(() => {
    const todaySessions = sleepSessions.filter((s) => isToday(s.start_time))
    const totalMinutes = todaySessions.reduce((sum, s) => sum + (s.duration_hours ?? 0) * 60, 0)
    const hours = Math.floor(totalMinutes / 60)
    const mins = Math.round(totalMinutes % 60)
    // Bar heights for visualization (normalized to max 32px)
    const durations = todaySessions.map((s) => s.duration_hours ?? 0)
    const maxDur = Math.max(...durations, 1)
    const bars = durations.slice(0, 4).map((d) => Math.max(8, Math.round((d / maxDur) * 32)))
    return { count: todaySessions.length, hours, mins, bars }
  }, [sleepSessions])

  // Feeding stats
  const feedingStats = useMemo(() => {
    const todayFeedings = feedings.filter((f) => isToday(f.fed_at))
    const totalMl = todayFeedings.reduce((sum, f) => sum + (f.volume_ml ?? 0), 0)
    const pct = Math.min(Math.round((totalMl / 800) * 100), 100)
    const lastFeed = todayFeedings[0] ?? null
    return { count: todayFeedings.length, totalMl, pct, lastFeed }
  }, [feedings])

  // Diaper stats
  const diaperStats = useMemo(() => {
    const todayChanges = diaperChanges.filter((d) => isToday(d.changed_at))
    const wet = todayChanges.filter((d) => d.status === 'wet').length
    const lastChange = todayChanges[0] ?? null
    return { count: todayChanges.length, wet, lastChange }
  }, [diaperChanges])

  // Growth stats
  const growthStats = useMemo(() => {
    const latest = growthRecords[0] ?? null
    const previous = growthRecords[1] ?? null
    let delta: number | null = null
    if (latest?.weight_kg != null && previous?.weight_kg != null) {
      delta = Math.round((latest.weight_kg - previous.weight_kg) * 1000) // grams
    }
    let daysAgo: number | null = null
    if (latest) {
      daysAgo = Math.floor((Date.now() - new Date(latest.measured_at).getTime()) / (1000 * 60 * 60 * 24))
    }
    return { latest, delta, daysAgo }
  }, [growthRecords])

  // Pumping stats
  const pumpingStats = useMemo(() => {
    const todaySessions = pumpingSessions.filter((s) => isToday(s.pumped_at))
    const totalMl = todaySessions.reduce((sum, s) => sum + s.volume_ml, 0)
    const lastSession = todaySessions[0] ?? null
    return { count: todaySessions.length, totalMl, lastSession }
  }, [pumpingSessions])

  const barColors = ['bg-indigo-200', 'bg-indigo-500', 'bg-indigo-300', 'bg-indigo-400']

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {/* Sleep Card */}
      <div
        className="relative cursor-pointer overflow-hidden rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm transition-all hover:shadow-md"
        onClick={() => navigate('/sleep-tracker')}
      >
        <div className="absolute right-0 top-0 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <Moon className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-8 space-y-1">
          <h4 className="text-sm font-bold text-slate-500">{t('home.summary.sleep')}</h4>
          {sleepStats.count > 0 ? (
            <p className="text-2xl font-black">
              {sleepStats.hours}h{' '}
              <span className="text-sm font-bold text-slate-400">{sleepStats.mins}m</span>
            </p>
          ) : (
            <p className="text-lg font-bold text-slate-300">{t('home.summary.noData')}</p>
          )}
        </div>
        {sleepStats.bars.length > 0 ? (
          <div className="mt-4 flex items-end gap-1" style={{ height: 32 }}>
            {sleepStats.bars.map((h, i) => (
              <div
                key={i}
                className={`w-full rounded-full ${barColors[i % barColors.length]}`}
                style={{ height: h }}
              />
            ))}
          </div>
        ) : (
          <div className="mt-4 flex items-end gap-1" style={{ height: 32 }}>
            {[12, 20, 16, 8].map((h, i) => (
              <div key={i} className="w-full rounded-full bg-slate-100" style={{ height: h }} />
            ))}
          </div>
        )}
        <p className="mt-2 text-[10px] font-medium text-slate-400">
          {sleepStats.count} {t('home.summary.naps')} • {t('home.summary.totalToday')}
        </p>
      </div>

      {/* Feeding Card */}
      <div
        className="relative cursor-pointer overflow-hidden rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm transition-all hover:shadow-md"
        onClick={() => navigate('/feeding-tracker')}
      >
        <div className="absolute right-0 top-0 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
            <Utensils className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-8 space-y-1">
          <h4 className="text-sm font-bold text-slate-500">{t('home.summary.feeding')}</h4>
          {feedingStats.count > 0 ? (
            <p className="text-2xl font-black">
              {feedingStats.totalMl > 0
                ? <>{feedingStats.totalMl} <span className="text-sm font-bold text-slate-400">ml</span></>
                : <>{feedingStats.count} <span className="text-sm font-bold text-slate-400">{t('home.summary.feedings')}</span></>
              }
            </p>
          ) : (
            <p className="text-lg font-bold text-slate-300">{t('home.summary.noData')}</p>
          )}
        </div>
        <div className="mt-4 flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-rose-400 transition-all"
              style={{ width: `${feedingStats.pct}%` }}
            />
          </div>
          <span className="text-[10px] font-bold text-rose-500">{feedingStats.pct}%</span>
        </div>
        <p className="mt-2 text-[10px] font-medium text-slate-400">
          {feedingStats.lastFeed
            ? `${t('home.summary.last')}: ${formatTimeAgo(feedingStats.lastFeed.fed_at)} ${t('home.status.ago')}`
            : t('home.summary.noData')}
        </p>
      </div>

      {/* Diaper Card */}
      <div
        className="relative cursor-pointer overflow-hidden rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm transition-all hover:shadow-md"
        onClick={() => navigate('/diaper-tracker')}
      >
        <div className="absolute right-0 top-0 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-8 space-y-1">
          <h4 className="text-sm font-bold text-slate-500">{t('home.summary.diaper')}</h4>
          {diaperStats.count > 0 ? (
            <p className="text-2xl font-black">
              {diaperStats.count}{' '}
              <span className="text-sm font-bold text-slate-400">{t('home.summary.changes')}</span>
            </p>
          ) : (
            <p className="text-lg font-bold text-slate-300">{t('home.summary.noData')}</p>
          )}
        </div>
        <div className="mt-4 grid grid-cols-6 gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full ${i < diaperStats.count ? 'bg-emerald-400' : 'bg-emerald-100'}`}
            />
          ))}
        </div>
        <p className="mt-2 text-[10px] font-medium text-slate-400">
          {diaperStats.lastChange
            ? `${t('home.summary.last')}: ${formatTimeAgo(diaperStats.lastChange.changed_at)} ${t('home.status.ago')}`
            : t('home.summary.noData')}
        </p>
      </div>

      {/* Growth Card */}
      <div
        className="relative cursor-pointer overflow-hidden rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm transition-all hover:shadow-md"
        onClick={() => navigate('/growth')}
      >
        <div className="absolute right-0 top-0 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <Ruler className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-8 space-y-1">
          <h4 className="text-sm font-bold text-slate-500">{t('home.summary.weight')}</h4>
          {growthStats.latest?.weight_kg != null ? (
            <p className="text-2xl font-black">
              {growthStats.latest.weight_kg}{' '}
              <span className="text-sm font-bold text-slate-400">kg</span>
            </p>
          ) : (
            <p className="text-lg font-bold text-slate-300">{t('home.summary.noRecords')}</p>
          )}
        </div>
        {growthStats.delta !== null ? (
          <div className="mt-4 flex items-center text-emerald-500">
            <TrendingUp className="h-4 w-4" />
            <span className="ml-1 text-[10px] font-bold">
              {growthStats.delta > 0 ? '+' : ''}{growthStats.delta}g {t('home.summary.thisWeek')}
            </span>
          </div>
        ) : (
          <div className="mt-4 h-4" />
        )}
        <p className="mt-2 text-[10px] font-medium text-slate-400">
          {growthStats.daysAgo !== null
            ? `${t('home.summary.lastRecord')}: ${growthStats.daysAgo}${t('home.summary.daysAgo')}`
            : t('home.summary.noRecords')}
        </p>
      </div>

      {/* Pumping Card */}
      <div
        className="relative cursor-pointer overflow-hidden rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm transition-all hover:shadow-md"
        onClick={() => navigate('/pumping-tracker')}
      >
        <div className="absolute right-0 top-0 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-fuchsia-50 text-fuchsia-500">
            <Droplets className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-8 space-y-1">
          <h4 className="text-sm font-bold text-slate-500">{t('home.summary.pumping')}</h4>
          {pumpingStats.count > 0 ? (
            <p className="text-2xl font-black">
              {pumpingStats.totalMl}{' '}
              <span className="text-sm font-bold text-slate-400">ml</span>
            </p>
          ) : (
            <p className="text-lg font-bold text-slate-300">{t('home.summary.noData')}</p>
          )}
        </div>
        <div className="mt-4 flex items-end gap-1" style={{ height: 32 }}>
          {pumpingStats.count > 0 ? (
            <>
              {(() => {
                const todaySessions = pumpingSessions.filter((s) => isToday(s.pumped_at))
                const leftMl = todaySessions.filter((s) => s.side === 'left').reduce((sum, s) => sum + s.volume_ml, 0)
                const rightMl = todaySessions.filter((s) => s.side === 'right').reduce((sum, s) => sum + s.volume_ml, 0)
                const bothMl = todaySessions.filter((s) => s.side === 'both').reduce((sum, s) => sum + s.volume_ml, 0)
                const max = Math.max(leftMl, rightMl, bothMl, 1)
                return (
                  <>
                    <div className="w-full rounded-full bg-pink-300" style={{ height: Math.max(6, Math.round((leftMl / max) * 32)) }} />
                    <div className="w-full rounded-full bg-blue-300" style={{ height: Math.max(6, Math.round((rightMl / max) * 32)) }} />
                    <div className="w-full rounded-full bg-purple-300" style={{ height: Math.max(6, Math.round((bothMl / max) * 32)) }} />
                  </>
                )
              })()}
            </>
          ) : (
            <>
              <div className="w-full rounded-full bg-slate-100" style={{ height: 12 }} />
              <div className="w-full rounded-full bg-slate-100" style={{ height: 20 }} />
              <div className="w-full rounded-full bg-slate-100" style={{ height: 16 }} />
            </>
          )}
        </div>
        <p className="mt-2 text-[10px] font-medium text-slate-400">
          {pumpingStats.lastSession
            ? `${pumpingStats.count} ${t('home.summary.sessions')} • ${t('home.summary.totalToday')}`
            : t('home.summary.noData')}
        </p>
      </div>
    </div>
  )
}
