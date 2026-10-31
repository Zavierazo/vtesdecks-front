import { ApiAchievementBadge } from './api-achievement'

export interface ApiPublicUser {
  user: string
  displayName: string
  profileImage: string
  veknId?: string
  archonProfileUrl?: string
  roles: string[]
  followers: ApiPublicUser[]
  following: ApiPublicUser[]
  achievementBadges?: ApiAchievementBadge[]
}
