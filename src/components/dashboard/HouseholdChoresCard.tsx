import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { useAddCareTask } from '@/hooks/useCareTasks'
import { Card, CardContent } from '@/components/ui/card'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { ChevronDown, UtensilsCrossed, SprayCan, Shirt, Stethoscope, ShoppingCart, Bath, Sparkles, Gamepad2, FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { HOUSEHOLD_TASK_TYPES } from '@/types'
import type { TaskType } from '@/types'

const TASK_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  cooking: UtensilsCrossed,
  cleaning: SprayCan,
  laundry: Shirt,
  doctor_visit: Stethoscope,
  shopping: ShoppingCart,
  bathing: Bath,
  sterilizing: Sparkles,
  playtime: Gamepad2,
  other: FileText,
}

const TASK_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  cooking:      { text: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200' },
  cleaning:     { text: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200' },
  laundry:      { text: 'text-cyan-500', bg: 'bg-cyan-50', border: 'border-cyan-200' },
  doctor_visit: { text: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200' },
  shopping:     { text: 'text-green-500', bg: 'bg-green-50', border: 'border-green-200' },
  bathing:      { text: 'text-sky-500', bg: 'bg-sky-50', border: 'border-sky-200' },
  sterilizing:  { text: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-200' },
  playtime:     { text: 'text-pink-500', bg: 'bg-pink-50', border: 'border-pink-200' },
  other:        { text: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200' },
}

interface HouseholdChoresCardProps {
  babyId: string | undefined
  isDemo: boolean
}

export function HouseholdChoresCard({ babyId, isDemo }: HouseholdChoresCardProps) {
  const { t } = useLanguage()
  const { user } = useAuth()
  const addTask = useAddCareTask()
  const [expanded, setExpanded] = useState(false)
  const [pendingTask, setPendingTask] = useState<string | null>(null)

  const handleLog = async (taskType: TaskType) => {
    if (isDemo || !babyId || !user) return
    setPendingTask(taskType)
    try {
      const now = new Date().toISOString()
      await addTask.mutateAsync({
        baby_id: babyId,
        caregiver_id: user.id,
        task_type: taskType,
        completed: true,
        assigned_at: now,
        completed_at: now,
        notes: null,
      })
      toast.success(t('dashboard.tasks.logged'))
    } catch {
      toast.error(t('common.error'))
    } finally {
      setPendingTask(null)
    }
  }

  return (
    <Card className="border-slate-200 bg-white transition-all hover:shadow-md">
      <CardContent className="p-4 space-y-3">
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleTrigger asChild>
            <button
              className="flex w-full items-center justify-between"
              aria-expanded={expanded}
            >
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">{t('dashboard.chores.title')}</h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                  {t('dashboard.chores.lowPriority')}
                </span>
              </div>
              <ChevronDown
                className={`size-5 text-slate-400 transition-transform duration-200 ${expanded ? '' : '-rotate-90'}`}
              />
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
            <div className="grid grid-cols-2 gap-2 pt-3 sm:grid-cols-3 md:grid-cols-5">
              {HOUSEHOLD_TASK_TYPES.map((taskType) => {
                const Icon = TASK_ICONS[taskType] ?? FileText
                const label = t(`dashboard.task.${taskType}` as keyof typeof t)
                const colors = TASK_COLORS[taskType] ?? TASK_COLORS.other
                const isPending = pendingTask === taskType
                return (
                  <button
                    key={taskType}
                    onClick={() => handleLog(taskType)}
                    disabled={isDemo || isPending}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-all hover:shadow-sm active:scale-95 disabled:opacity-50 min-h-[44px] ${colors.bg} ${colors.border}`}
                    aria-label={`${label}`}
                  >
                    {isPending ? (
                      <Loader2 className="size-5 animate-spin text-slate-400" />
                    ) : (
                      <Icon className={`size-5 ${colors.text}`} />
                    )}
                    {label}
                  </button>
                )
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}
