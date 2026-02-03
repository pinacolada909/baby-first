export type Language = 'en' | 'zh'

export type CaregiverRole = 'primary' | 'member'

export type DiaperStatus = 'wet' | 'dirty' | 'mixed' | 'dry'

export type FeedingType = 'breastmilk' | 'formula' | 'ready_to_feed'

export type TaskType =
  | 'change_diapers'
  | 'feeding'
  | 'cooking'
  | 'cleaning'
  | 'laundry'
  | 'doctor_visit'
  | 'shopping'

export type TimeBlockType = 'care' | 'rest'

export interface Baby {
  id: string
  name: string
  birth_date: string | null
  created_at: string
}

export interface BabyCaregiver {
  baby_id: string
  user_id: string
  role: CaregiverRole
  display_name: string
  joined_at: string
}

export interface BabyInvite {
  id: string
  baby_id: string
  code: string
  created_by: string
  expires_at: string
  used_by: string | null
  used_at: string | null
  created_at: string
}

export interface Profile {
  id: string
  display_name: string
  created_at: string
  updated_at: string
}

export interface SleepSession {
  id: string
  baby_id: string
  caregiver_id: string
  start_time: string
  end_time: string
  duration_hours: number
  notes: string | null
  created_at: string
}

export interface DiaperChange {
  id: string
  baby_id: string
  caregiver_id: string
  changed_at: string
  status: DiaperStatus
  notes: string | null
  created_at: string
}

export interface Feeding {
  id: string
  baby_id: string
  caregiver_id: string
  fed_at: string
  feeding_type: FeedingType
  volume_ml: number | null
  duration_minutes: number | null
  notes: string | null
  created_at: string
}

export interface TimeBlock {
  id: string
  baby_id: string
  caregiver_id: string
  block_type: TimeBlockType
  start_time: string
  end_time: string
  notes: string | null
  created_at: string
}

export interface CareTask {
  id: string
  baby_id: string
  caregiver_id: string
  task_type: TaskType
  completed: boolean
  assigned_at: string
  completed_at: string | null
  notes: string | null
  created_at: string
}
