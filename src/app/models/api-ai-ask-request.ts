import { ApiAiMessage } from './api-ai-message'

export interface ApiAiAskRequest {
  chatHistory: ApiAiMessage[]
  question: string
}
