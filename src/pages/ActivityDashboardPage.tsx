import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { useBaby } from '@/contexts/BabyContext'
import { useCaregivers } from '@/hooks/useCaregivers'
import { useActivityDashboard } from '@/hooks/useActivityDashboard'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { queryKeys } from '@/lib/query-keys'
import type { DateRange, CaregiverActivity } from '@/hooks/useActivityDashboard'
import type { BabyCaregiver, TaskType, CareTask } from '@/types'
import { HOUSEHOLD_TASK_TYPES } from '@/types'
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter'
import { WorkloadSummaryCards } from '@/components/dashboard/WorkloadSummaryCards'
import { WorkloadBalanceBar } from '@/components/dashboard/WorkloadBalanceBar'
import { ActivityBreakdownChart } from '@/components/dashboard/ActivityBreakdownChart'
import { HouseholdTaskLogger } from '@/components/dashboard/HouseholdTaskLogger'

// Demo data generators
function makeDemoActivities(): CaregiverActivity[] {
  return [
    {
      caregiverId: 'demo-1',
      displayName: 'Parent 1',
      feedings: 5,
      diapers: 4,
      sleepPutdowns: 3,
      householdTasks: 2,
      total: 14,
    },
    {
      caregiverId: 'demo-2',
      displayName: 'Parent 2',
      feedings: 3,
      diapers: 5,
      sleepPutdowns: 2,
      householdTasks: 4,
      total: 14,
    },
    {
      caregiverId: 'demo-3',
      displayName: 'Grandparent',
      feedings: 2,
      diapers: 1,
      sleepPutdowns: 1,
      householdTasks: 3,
      total: 7,
    },
  ]
}

interface DemoTask extends CareTask {
  caregiverName: string
}

function makeDemoTasks(): DemoTask[] {
  const now = Date.now()
  return [
    {
      id: 'dt-1',
      baby_id: 'demo',
      caregiver_id: 'demo-1',
      task_type: 'cooking' as TaskType,
      completed: true,
      assigned_at: new Date(now - 2 * 3600000).toISOString(),
      completed_at: new Date(now - 2 * 3600000).toISOString(),
      notes: null,
      created_at: new Date(now - 2 * 3600000).toISOString(),
      caregiverName: 'Parent 1',
    },
    {
      id: 'dt-2',
      baby_id: 'demo',
      caregiver_id: 'demo-2',
      task_type: 'shopping' as TaskType,
      completed: true,
      assigned_at: new Date(now - 5 * 3600000).toISOString(),
      completed_at: new Date(now - 5 * 3600000).toISOString(),
      notes: null,
      created_at: new Date(now - 5 * 3600000).toISOString(),
      caregiverName: 'Parent 2',
    },
    {
      id: 'dt-3',
      baby_id: 'demo',
      caregiver_id: 'demo-3',
      task_type: 'bathing' as TaskType,
      completed: true,
      assigned_at: new Date(now - 8 * 3600000).toISOString(),
      completed_at: new Date(now - 8 * 3600000).toISOString(),
      notes: null,
      created_at: new Date(now - 8 * 3600000).toISOString(),
      caregiverName: 'Grandparent',
    },
  ]
}

export function ActivityDashboardPage() {
  const { t } = useLanguage()
  const { isDemo } = useAuth()
  const { selectedBaby } = useBaby()
  const babyId = isDemo ? undefined : selectedBaby?.id

  const [dateRange, setDateRange] = useState<DateRange>('today')

  // DB data
  const { data: dbCaregivers = [] } = useCaregivers(babyId)
  const caregiverList: BabyCaregiver[] = isDemo
    ? [
        { user_id: 'demo-1', display_name: 'Parent 1', role: 'primary', baby_id: 'demo', joined_at: '' },
        { user_id: 'demo-2', display_name: 'Parent 2', role: 'member', baby_id: 'demo', joined_at: '' },
        { user_id: 'demo-3', display_name: 'Grandparent', role: 'member', baby_id: 'demo', joined_at: '' },
      ]
    : dbCaregivers

  const { caregiverActivities, totalActivities, recentTasks } = useActivityDashboard(
    babyId,
    caregiverList,
    dateRange,
  )

  // Realtime sync for care_tasks
  useRealtimeSync('care_tasks', babyId, queryKeys.careTasks.byBaby(babyId ?? ''))

  // Demo state
  const [demoActivities, setDemoActivities] = useState(() => makeDemoActivities())
  const [demoTasks, setDemoTasks] = useState(() => makeDemoTasks())

  const displayActivities = isDemo ? demoActivities : caregiverActivities
  const displayTotal = isDemo
    ? demoActivities.reduce((sum, cg) => sum + cg.total, 0)
    : totalActivities
  const displayRecentTasks = isDemo ? demoTasks : recentTasks

  // Demo handlers
  const handleDemoLog = (taskType: TaskType) => {
    const now = new Date().toISOString()
    const newTask: DemoTask = {
      id: crypto.randomUUID(),
      baby_id: 'demo',
      caregiver_id: 'demo-1',
      task_type: taskType,
      completed: true,
      assigned_at: now,
      completed_at: now,
      notes: null,
      created_at: now,
      caregiverName: 'Parent 1',
    }
    setDemoTasks((prev) => [newTask, ...prev].slice(0, 10))
    setDemoActivities((prev) =>
      prev.map((cg) =>
        cg.caregiverId === 'demo-1'
          ? { ...cg, householdTasks: cg.householdTasks + 1, total: cg.total + 1 }
          : cg,
      ),
    )
  }

  const handleDemoDelete = (id: string) => {
    const task = demoTasks.find((t) => t.id === id)
    setDemoTasks((prev) => prev.filter((t) => t.id !== id))
    if (task && HOUSEHOLD_TASK_TYPES.includes(task.task_type)) {
      setDemoActivities((prev) =>
        prev.map((cg) =>
          cg.caregiverId === task.caregiver_id
            ? { ...cg, householdTasks: Math.max(0, cg.householdTasks - 1), total: Math.max(0, cg.total - 1) }
            : cg,
        ),
      )
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('dashboard.subtitle')}</p>
      </div>

      {/* Date Range Filter */}
      <DateRangeFilter value={dateRange} onChange={setDateRange} />

      {/* Workload Summary Cards */}
      <WorkloadSummaryCards activities={displayActivities} />

      {/* Workload Balance Bar */}
      <WorkloadBalanceBar activities={displayActivities} totalActivities={displayTotal} />

      {/* Activity Breakdown Chart */}
      <ActivityBreakdownChart activities={displayActivities} />

      {/* Household Task Logger */}
      <HouseholdTaskLogger
        babyId={babyId}
        recentTasks={displayRecentTasks}
        isDemo={isDemo}
        onDemoLog={handleDemoLog}
        onDemoDelete={handleDemoDelete}
      />
    </div>
  )
}
