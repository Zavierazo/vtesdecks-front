import { ApiComment } from './../../models/api-comment';
import { CommentsQuery } from './comments.query';
import { ApiDataService } from './../../services/api.data.service';
import { Injectable } from '@angular/core';
import { tap, switchMap, of, Observable, EMPTY, filter } from 'rxjs';
import { CommentsStore } from './comments.store';
import { transaction } from '@datorama/akita';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
@Injectable({
  providedIn: 'root',
})
export class CommentsService {
  static readonly limit = 10;

  constructor(
    private commentsStore: CommentsStore,
    private apiDataService: ApiDataService
  ) { }

  getComments(id: string): Observable<ApiComment[]> {
    this.commentsStore.reset();
    this.commentsStore.setLoading(true);
    return this.apiDataService
      .getComments(id)
      .pipe(
        tap((comments: ApiComment[]) => this.updateComments(comments))
      );
  }

  addComment(comment: ApiComment): Observable<ApiComment> {
    return this.apiDataService.addComment(comment)
      .pipe(
        filter((comment: ApiComment) => comment.id !== undefined),
        tap((comment: ApiComment) => this.commentsStore.add(comment))
      )
  }

  editComment(comment: ApiComment): Observable<ApiComment> {
    return this.apiDataService.editComment(comment)
      .pipe(
        filter((comment: ApiComment) => comment.id !== undefined),
        tap((comment: ApiComment) => this.commentsStore.update(comment.id, comment))
      )
  }

  deleteComment(id: number): Observable<boolean> {
    return this.apiDataService.deleteComment(id)
      .pipe(
        filter((response) => response === true),
        tap(() => this.commentsStore.remove(id))
      );
  }

  @transaction()
  private updateComments(comments: ApiComment[]) {
    this.commentsStore.set(comments)
    this.commentsStore.setLoading();
  }
}
