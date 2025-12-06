import { ApiAiMessage } from './api-ai-message'

export interface ApiAiAskRequest {
  sessionId: string
  question: string
  chatHistory?: ApiAiMessage[]
}
