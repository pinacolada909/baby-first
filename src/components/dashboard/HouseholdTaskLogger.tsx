import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { useCaregivers } from '@/hooks/useCaregivers'
import { useAddCareTask, useDeleteCareTask } from '@/hooks/useCareTasks'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, UtensilsCrossed, SprayCan, Shirt, Stethoscope, ShoppingCart, Bath, Sparkles, Gamepad2, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { HOUSEHOLD_TASK_TYPES } from '@/types'
import type { TaskType, CareTask, BabyCaregiver } from '@/types'

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

interface RecentTask extends CareTask {
  caregiverName: string
}

interface HouseholdTaskLoggerProps {
  babyId: string | undefined
  recentTasks: RecentTask[]
  isDemo: boolean
  onDemoLog?: (taskType: TaskType) => void
  onDemoDelete?: (id: string) => void
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const then = new Date(dateStr)
  const diffMs = now.getTime() - then.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  return `${diffD}d ago`
}

export function HouseholdTaskLogger({
  babyId,
  recentTasks,
  isDemo,
  onDemoLog,
  onDemoDelete,
}: HouseholdTaskLoggerProps) {
  const { t } = useLanguage()
  const { user } = useAuth()
  const { data: caregivers = [] } = useCaregivers(babyId)
  const addTask = useAddCareTask()
  const deleteTask = useDeleteCareTask()

  const isPrimary = caregivers.some(
    (c: BabyCaregiver) => c.user_id === user?.id && c.role === 'primary',
  )
  const canDeleteTask = (task: RecentTask) =>
    isDemo || isPrimary || task.caregiver_id === user?.id

  const handleLog = async (taskType: TaskType) => {
    if (isDemo) {
      onDemoLog?.(taskType)
      toast.success(t('dashboard.tasks.logged'))
      return
    }
    if (!babyId || !user) return
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
    }
  }

  const handleDelete = async (id: string) => {
    if (isDemo) {
      onDemoDelete?.(id)
      toast.success(t('dashboard.tasks.deleted'))
      return
    }
    if (!babyId) return
    try {
      await deleteTask.mutateAsync({ id, babyId })
      toast.success(t('dashboard.tasks.deleted'))
    } catch {
      toast.error(t('common.error'))
    }
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <h3 className="text-sm font-medium">{t('dashboard.tasks.title')}</h3>

        {/* Quick-log grid */}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {HOUSEHOLD_TASK_TYPES.map((taskType) => {
            const Icon = TASK_ICONS[taskType] ?? FileText
            const label = t(`dashboard.task.${taskType}` as keyof typeof t)
            return (
              <button
                key={taskType}
                onClick={() => handleLog(taskType)}
                className="flex flex-col items-center gap-1 rounded-lg border p-3 text-xs font-medium transition-colors hover:bg-purple-50 hover:border-purple-300 active:bg-purple-100"
              >
                <Icon className="h-5 w-5 text-purple-600" />
                {label}
              </button>
            )
          })}
        </div>

        {/* Recent tasks */}
        <div>
          <h4 className="mb-2 text-xs font-medium text-muted-foreground">
            {t('dashboard.tasks.recent')}
          </h4>
          {recentTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('dashboard.tasks.empty')}</p>
          ) : (
            <div className="space-y-2">
              {recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {t(`dashboard.task.${task.task_type}` as keyof typeof t)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{task.caregiverName}</span>
                    <span className="text-xs text-muted-foreground">
                      {task.completed_at ? timeAgo(task.completed_at) : ''}
                    </span>
                  </div>
                  {canDeleteTask(task) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(task.id)}
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
