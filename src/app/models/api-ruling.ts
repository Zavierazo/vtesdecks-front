import { ApiRulingCard } from './api-ruling-card'
import { ApiRulingReference } from './api-ruling-reference'
import { ApiRulingSymbol } from './api-ruling-symbol'

export interface ApiRuling {
  references: ApiRulingReference[]
  symbols: ApiRulingSymbol[]
  cards: ApiRulingCard[]
  text: string
}
