import { useAuth } from '@/contexts/AuthContext'
import { useBaby } from '@/contexts/BabyContext'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { queryKeys } from '@/lib/query-keys'
import { FamilyStatusCard } from '@/components/dashboard/FamilyStatusCard'
import { CareWorkloadCard } from '@/components/dashboard/CareWorkloadCard'
import { MomRecoveryCard } from '@/components/dashboard/MomRecoveryCard'
import { TodayTasksCard } from '@/components/dashboard/TodayTasksCard'
import { HouseholdChoresCard } from '@/components/dashboard/HouseholdChoresCard'

export function ActivityDashboardPage() {
  const { isDemo } = useAuth()
  const { selectedBaby } = useBaby()
  const babyId = isDemo ? undefined : selectedBaby?.id

  // Realtime sync
  useRealtimeSync('care_tasks', babyId, queryKeys.careTasks.byBaby(babyId ?? ''))
  useRealtimeSync('time_blocks', babyId, queryKeys.timeBlocks.byBaby(babyId ?? ''))

  return (
    <div className="space-y-4">
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both">
        <FamilyStatusCard babyId={babyId} isDemo={isDemo} />
      </div>
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 delay-75 fill-mode-both">
        <CareWorkloadCard babyId={babyId} isDemo={isDemo} />
      </div>
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 delay-150 fill-mode-both">
        <MomRecoveryCard babyId={babyId} isDemo={isDemo} />
      </div>
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 delay-200 fill-mode-both">
        <TodayTasksCard babyId={babyId} isDemo={isDemo} />
      </div>
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 delay-300 fill-mode-both">
        <HouseholdChoresCard babyId={babyId} isDemo={isDemo} />
      </div>
    </div>
  )
}
