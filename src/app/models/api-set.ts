export type SetSortBy = keyof ApiSet

export interface ApiSet {
  id: number
  abbrev: string
  releaseDate?: Date
  fullName: string
  company?: string
  icon?: string
  lastUpdate: Date
}
