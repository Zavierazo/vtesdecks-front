import { Injectable } from '@angular/core'
import { filter, Observable, tap } from 'rxjs'
import { ApiComment } from './../../models/api-comment'
import { ApiDataService } from './../../services/api.data.service'
import { CommentsStore } from './comments.store'
@Injectable({
  providedIn: 'root',
})
export class CommentsService {
  static readonly limit = 10

  constructor(
    private commentsStore: CommentsStore,
    private apiDataService: ApiDataService,
  ) {}

  getComments(id: string): Observable<ApiComment[]> {
    this.commentsStore.reset()
    this.commentsStore.setLoading(true)
    return this.apiDataService
      .getComments(id)
      .pipe(tap((comments: ApiComment[]) => this.updateComments(comments)))
  }

  addComment(comment: ApiComment): Observable<ApiComment> {
    return this.apiDataService.addComment(comment).pipe(
      filter((comment: ApiComment) => comment.id !== undefined),
      tap((comment: ApiComment) => this.commentsStore.add(comment)),
    )
  }

  editComment(comment: ApiComment): Observable<ApiComment> {
    return this.apiDataService.editComment(comment).pipe(
      filter((comment: ApiComment) => comment.id !== undefined),
      tap((comment: ApiComment) =>
        this.commentsStore.update(comment.id, comment),
      ),
    )
  }

  deleteComment(id: number): Observable<boolean> {
    return this.apiDataService.deleteComment(id).pipe(
      filter((response) => response === true),
      tap(() => this.commentsStore.remove(id)),
    )
  }

  private updateComments(comments: ApiComment[]) {
    this.commentsStore.set(comments)
    this.commentsStore.setLoading()
  }
}
