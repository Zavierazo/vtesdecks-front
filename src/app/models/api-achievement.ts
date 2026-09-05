export interface ApiAchievementTier {
  id: string
  threshold: number
  earned: boolean
  earnedDate?: Date
  historical?: boolean
}

export interface ApiAchievementFamily {
  id: string
  icon: string
  progress?: number
  nextThreshold?: number
  repeatCount?: number
  tiers: ApiAchievementTier[]
  earnedDates?: Date[]
}

export interface ApiAchievementBadge {
  family: string
  achievementId: string
  tier: number
  count?: number
  icon: string
}
