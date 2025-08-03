import { ApiCollectionBinder } from './api-collection-binder'

export interface ApiCollection {
  id: number
  binders: ApiCollectionBinder[]
  creationDate: Date
  modificationDate: Date
}
