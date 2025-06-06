import { Injectable, inject } from '@angular/core'
import { map, Observable } from 'rxjs'
import { ApiComment } from '../../models/api-comment'
import { CommentsStore } from './comments.store'
@Injectable({
  providedIn: 'root',
})
export class CommentsQuery {
  private readonly store = inject(CommentsStore);


  selectLoading(): Observable<boolean> {
    return this.store.selectLoading()
  }

  selectAll(): Observable<ApiComment[]> {
    return this.store
      .selectState()
      .pipe(map((comments) => [...comments].sort(this.compareValue)))
  }

  private compareValue(a: ApiComment, b: ApiComment): number {
    if (a.created > b.created) {
      return -1
    } else if (a.created < b.created) {
      return 1
    }
    return 0
  }
}
