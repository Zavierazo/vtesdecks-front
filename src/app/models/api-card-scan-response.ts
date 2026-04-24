export interface ApiCardScanAlternative {
  id: number
  set?: string
  score: number
  confidence: number
}

export interface ApiCardScanResponse {
  found: boolean
  confidenceWarning: boolean
  id?: number
  set?: string
  confidence?: number
  score?: number
  elapsedMs?: number
  alternatives?: ApiCardScanAlternative[]
  message?: string
}
