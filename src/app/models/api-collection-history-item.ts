export interface ApiCollectionHistoryItem {
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  cardId: number
  cardName?: string
  number: number
  set?: string
  condition?: string
  language?: string
  binderId?: number
  date: string // ISO-8601 local datetime
}
