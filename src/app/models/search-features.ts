export type SearchPresetScope = 'crypt' | 'library' | 'decks'

export type SearchParams = Record<string, string>

export interface SavedSearchPreset {
  id: string
  remoteId?: number
  scope: SearchPresetScope
  name: string
  params: SearchParams
  createdAt: string
  updatedAt: string
}

export interface RecentSearch {
  id: string
  scope: SearchPresetScope
  params: SearchParams
  createdAt: string
}

export interface SearchFeaturesStorageV1 {
  version: 1
  presets: SavedSearchPreset[]
  history: RecentSearch[]
}
