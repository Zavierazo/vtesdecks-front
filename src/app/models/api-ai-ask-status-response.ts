export type AiTaskStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'ERROR'

export interface ApiAiAskStatusResponse {
  status: AiTaskStatus
  message?: string
  error?: string
}
