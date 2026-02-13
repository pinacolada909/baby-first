import { useLanguage } from '@/contexts/LanguageContext'
import type { DateRange } from '@/hooks/useActivityDashboard'

interface DateRangeFilterProps {
  value: DateRange
  onChange: (range: DateRange) => void
}

const RANGES: DateRange[] = ['today', 'week', 'month']

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const { t } = useLanguage()

  const labels: Record<DateRange, string> = {
    today: t('dashboard.range.today'),
    week: t('dashboard.range.week'),
    month: t('dashboard.range.month'),
  }

  return (
    <div className="flex gap-1 rounded-lg bg-muted p-1">
      {RANGES.map((range) => (
        <button
          key={range}
          onClick={() => onChange(range)}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            value === range
              ? 'bg-white text-purple-700 shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {labels[range]}
        </button>
      ))}
    </div>
  )
}
