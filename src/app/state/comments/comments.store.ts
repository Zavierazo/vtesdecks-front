import { ApiComment } from './../../models/api-comment'
import { Injectable } from '@angular/core'
import { EntityState, EntityStore, StoreConfig } from '@datorama/akita'

export interface CommentsState extends EntityState<ApiComment> {}

const initialState: CommentsState = {}

@Injectable({
  providedIn: 'root',
})
@StoreConfig({
  name: CommentsStore.storeName,
})
export class CommentsStore extends EntityStore<CommentsState, ApiComment> {
  static readonly storeName = 'comments'

  constructor() {
    super(initialState)
  }
}
