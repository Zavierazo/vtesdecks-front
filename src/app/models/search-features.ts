export type SearchBrowserType = 'crypt' | 'library' | 'decks'

export type SearchParams = Record<string, string>

export interface SavedSearchPreset {
  id: string
  browserType: SearchBrowserType
  name: string
  params: SearchParams
  createdAt: string
  updatedAt: string
}

export interface RecentSearch {
  id: string
  browserType: SearchBrowserType
  params: SearchParams
  createdAt: string
}

export interface SearchFeaturesStorageV1 {
  version: 1
  presets: SavedSearchPreset[]
  history: RecentSearch[]
}
