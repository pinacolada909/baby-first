export const queryKeys = {
  babies: {
    all: (userId: string) => ['babies', userId] as const,
    detail: (babyId: string) => ['babies', 'detail', babyId] as const,
  },
  caregivers: {
    byBaby: (babyId: string) => ['caregivers', babyId] as const,
  },
  invites: {
    byBaby: (babyId: string) => ['invites', babyId] as const,
  },
  sleep: {
    byBaby: (babyId: string) => ['sleep', babyId] as const,
    today: (babyId: string) => ['sleep', babyId, 'today'] as const,
  },
  diaper: {
    byBaby: (babyId: string) => ['diaper', babyId] as const,
    today: (babyId: string) => ['diaper', babyId, 'today'] as const,
  },
  feeding: {
    byBaby: (babyId: string) => ['feeding', babyId] as const,
    today: (babyId: string) => ['feeding', babyId, 'today'] as const,
    analytics: (babyId: string, period: string) => ['feeding', babyId, 'analytics', period] as const,
  },
  timeBlocks: {
    byBaby: (babyId: string) => ['timeBlocks', babyId] as const,
  },
  careTasks: {
    byBaby: (babyId: string) => ['careTasks', babyId] as const,
  },
  growth: {
    byBaby: (babyId: string) => ['growth', babyId] as const,
  },
  milestones: {
    byBaby: (babyId: string) => ['milestones', babyId] as const,
  },
  profile: {
    byUser: (userId: string) => ['profile', userId] as const,
  },
} as const
