export interface ApiCard {
  id: number
  number: number
  type?: string
  collection?: 'NONE' | 'PARTIAL' | 'FULL'
}
