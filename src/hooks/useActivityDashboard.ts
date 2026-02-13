import { useMemo } from 'react'
import { useSleepSessions } from './useSleepSessions'
import { useDiaperChanges } from './useDiaperChanges'
import { useFeedings } from './useFeedings'
import { useCareTasks } from './useCareTasks'
import type { BabyCaregiver } from '@/types'
import { HOUSEHOLD_TASK_TYPES } from '@/types'

export type DateRange = 'today' | 'week' | 'month'

export interface CaregiverActivity {
  caregiverId: string
  displayName: string
  feedings: number
  diapers: number
  sleepPutdowns: number
  householdTasks: number
  total: number
}

function getDateRangeStart(range: DateRange): Date {
  const now = new Date()
  if (range === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  } else if (range === 'week') {
    return new Date(now.getTime() - 7 * 86400000)
  } else {
    return new Date(now.getTime() - 30 * 86400000)
  }
}

export function useActivityDashboard(
  babyId: string | undefined,
  caregivers: BabyCaregiver[],
  dateRange: DateRange,
) {
  const { data: sleepSessions = [] } = useSleepSessions(babyId)
  const { data: diaperChanges = [] } = useDiaperChanges(babyId)
  const { data: feedings = [] } = useFeedings(babyId)
  const { data: careTasks = [] } = useCareTasks(babyId)

  const rangeStart = useMemo(() => getDateRangeStart(dateRange), [dateRange])

  const caregiverActivities = useMemo(() => {
    return caregivers.map((cg) => {
      const cgFeedings = feedings.filter(
        (f) => f.caregiver_id === cg.user_id && new Date(f.fed_at) >= rangeStart,
      )
      const cgDiapers = diaperChanges.filter(
        (d) => d.caregiver_id === cg.user_id && new Date(d.changed_at) >= rangeStart,
      )
      const cgSleep = sleepSessions.filter(
        (s) => s.caregiver_id === cg.user_id && new Date(s.start_time) >= rangeStart,
      )
      const cgTasks = careTasks.filter(
        (t) =>
          t.caregiver_id === cg.user_id &&
          t.completed &&
          t.completed_at &&
          new Date(t.completed_at) >= rangeStart &&
          HOUSEHOLD_TASK_TYPES.includes(t.task_type),
      )

      const feedingsCount = cgFeedings.length
      const diapersCount = cgDiapers.length
      const sleepCount = cgSleep.length
      const tasksCount = cgTasks.length

      return {
        caregiverId: cg.user_id,
        displayName: cg.display_name,
        feedings: feedingsCount,
        diapers: diapersCount,
        sleepPutdowns: sleepCount,
        householdTasks: tasksCount,
        total: feedingsCount + diapersCount + sleepCount + tasksCount,
      } satisfies CaregiverActivity
    })
  }, [caregivers, feedings, diaperChanges, sleepSessions, careTasks, rangeStart])

  const totalActivities = useMemo(
    () => caregiverActivities.reduce((sum, cg) => sum + cg.total, 0),
    [caregiverActivities],
  )

  // Recent household tasks (last 10, across all caregivers, within range)
  const recentTasks = useMemo(() => {
    return careTasks
      .filter(
        (t) =>
          t.completed &&
          t.completed_at &&
          new Date(t.completed_at) >= rangeStart &&
          HOUSEHOLD_TASK_TYPES.includes(t.task_type),
      )
      .slice(0, 10)
      .map((t) => ({
        ...t,
        caregiverName:
          caregivers.find((c) => c.user_id === t.caregiver_id)?.display_name ?? '?',
      }))
  }, [careTasks, caregivers, rangeStart])

  return {
    caregiverActivities,
    totalActivities,
    recentTasks,
  }
}
