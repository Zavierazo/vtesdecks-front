export interface ApiDeckBuilderHistory {
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  cardId: number
  number: number
  date: string
  tag?: number
  tagLabel?: string
}
