export interface ApiUser {
  user?: string
  email?: string
  token?: string
  message?: string
  displayName?: string
  profileImage?: string
  admin?: boolean
  roles?: string[]
  notificationCount?: number
}
