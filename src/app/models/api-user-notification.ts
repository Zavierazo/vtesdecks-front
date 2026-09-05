export interface ApiUserNotification {
  id: number
  read: boolean
  type: string
  notification: string
  link: string
  data?: ApiUserNotificationData
  creationDate: Date
}

export interface ApiUserNotificationData {
  family?: string
  tier?: number
}
