import type { TranslationKey } from '@/translations/en'

export interface MilestoneDefinition {
  key: string
  labelKey: TranslationKey
}

export interface MilestoneGroup {
  titleKey: TranslationKey
  milestones: MilestoneDefinition[]
}

export const MILESTONE_GROUPS: MilestoneGroup[] = [
  {
    titleKey: 'growth.milestone.month.0',
    milestones: [
      { key: 'm0_lifts_head', labelKey: 'milestone.0.1' },
      { key: 'm0_responds_sounds', labelKey: 'milestone.0.2' },
      { key: 'm0_focuses_faces', labelKey: 'milestone.0.3' },
      { key: 'm0_grasps_finger', labelKey: 'milestone.0.4' },
    ],
  },
  {
    titleKey: 'growth.milestone.month.1',
    milestones: [
      { key: 'm1_social_smile', labelKey: 'milestone.1.1' },
      { key: 'm1_follows_objects', labelKey: 'milestone.1.2' },
      { key: 'm1_coos', labelKey: 'milestone.1.3' },
      { key: 'm1_holds_head_45', labelKey: 'milestone.1.4' },
    ],
  },
  {
    titleKey: 'growth.milestone.month.2',
    milestones: [
      { key: 'm2_holds_head_steady', labelKey: 'milestone.2.1' },
      { key: 'm2_hands_together', labelKey: 'milestone.2.2' },
      { key: 'm2_laughs', labelKey: 'milestone.2.3' },
      { key: 'm2_pushes_up', labelKey: 'milestone.2.4' },
    ],
  },
  {
    titleKey: 'growth.milestone.month.3',
    milestones: [
      { key: 'm3_rolls_over', labelKey: 'milestone.3.1' },
      { key: 'm3_reaches_objects', labelKey: 'milestone.3.2' },
      { key: 'm3_babbles', labelKey: 'milestone.3.3' },
      { key: 'm3_bears_weight', labelKey: 'milestone.3.4' },
    ],
  },
  {
    titleKey: 'growth.milestone.month.4',
    milestones: [
      { key: 'm4_sits_support', labelKey: 'milestone.4.1' },
      { key: 'm4_transfers_objects', labelKey: 'milestone.4.2' },
      { key: 'm4_responds_name', labelKey: 'milestone.4.3' },
      { key: 'm4_finds_hidden', labelKey: 'milestone.4.4' },
    ],
  },
  {
    titleKey: 'growth.milestone.month.5',
    milestones: [
      { key: 'm5_sits_unsupported', labelKey: 'milestone.5.1' },
      { key: 'm5_solid_foods', labelKey: 'milestone.5.2' },
      { key: 'm5_stranger_anxiety', labelKey: 'milestone.5.3' },
      { key: 'm5_passes_objects', labelKey: 'milestone.5.4' },
    ],
  },
]
