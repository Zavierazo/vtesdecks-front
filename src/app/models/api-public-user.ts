import { ApiAchievementBadge } from './api-achievement'

export interface ApiPublicUser {
  user: string
  displayName: string
  profileImage: string
  roles: string[]
  followers: ApiPublicUser[]
  following: ApiPublicUser[]
  achievementBadges?: ApiAchievementBadge[]
}
