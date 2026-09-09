import type { ApiUser } from './api-user'

export interface ApiUserSettingsResponse {
  successful: boolean
  message?: string
  authenticatedUser?: ApiUser
}
