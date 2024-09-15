import { ApiKrcgRulingCard } from './api-krcg-ruling-card'
import { ApiKrcgRulingReference } from './api-krcg-ruling-reference'
import { ApiKrcgRulingSymbol } from './api-krcg-ruling-symbol'

export interface ApiKrcgRuling {
  references: ApiKrcgRulingReference[]
  symbols: ApiKrcgRulingSymbol[]
  cards: ApiKrcgRulingCard[]
  text: string
}
