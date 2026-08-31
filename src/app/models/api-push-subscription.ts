export interface ApiPushConfig {
  enabled: boolean
  publicKey: string | null
}

export interface ApiPushSubscription {
  endpoint: string
  expirationTime: number | null
  keys: {
    p256dh: string
    auth: string
  }
}
