import { SearchPresetScope, SearchParams } from './search-features'

export interface ApiSearchPreset {
  id?: number
  clientId?: string
  scope: SearchPresetScope
  name: string
  params: SearchParams
  creationDate?: string
  modificationDate?: string
}
