export interface ApiArchonStatus {
  available: boolean
  linked: boolean
  veknId: string | null
}

export interface ApiArchonAuthorization {
  authorizationUrl: string
}

export interface ApiArchonCallback {
  state?: string
  code?: string
  error?: string
}
