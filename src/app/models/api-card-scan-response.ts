export interface ApiCardScanAlternative {
  id: string
  set?: string
  score: number
  confidence: number
}

export interface ApiCardScanResponse {
  found: boolean
  id?: string
  set?: string
  confidence?: number
  score?: number
  elapsedMs?: number
  alternatives?: ApiCardScanAlternative[]
  message?: string
}
