import { ApiComment } from './../../models/api-comment';
import { Injectable } from '@angular/core';
import { QueryEntity } from '@datorama/akita';
import { CommentsState, CommentsStore } from './comments.store';
@Injectable({
  providedIn: 'root',
})
export class CommentsQuery extends QueryEntity<CommentsState, ApiComment> {
  constructor(protected override store: CommentsStore) {
    super(store);
  }


}
