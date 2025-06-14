import { inject, Injectable, SecurityContext } from '@angular/core'
import { DomSanitizer } from '@angular/platform-browser'
import { filter, Observable, tap } from 'rxjs'
import { ApiComment } from './../../models/api-comment'
import { ApiDataService } from './../../services/api.data.service'
import { CommentsStore } from './comments.store'
@Injectable({
  providedIn: 'root',
})
export class CommentsService {
  private readonly commentsStore = inject(CommentsStore)
  private readonly apiDataService = inject(ApiDataService)
  private readonly sanitizer = inject(DomSanitizer)

  static readonly limit = 10

  getComments(id: string): Observable<ApiComment[]> {
    this.commentsStore.reset()
    this.commentsStore.setLoading(true)
    return this.apiDataService
      .getComments(id)
      .pipe(tap((comments: ApiComment[]) => this.updateComments(comments)))
  }

  addComment(comment: ApiComment): Observable<ApiComment> {
    return this.apiDataService.addComment(this.sanitizeComment(comment)).pipe(
      filter((comment: ApiComment) => comment.id !== undefined),
      tap((comment: ApiComment) => this.commentsStore.add(comment)),
    )
  }

  editComment(comment: ApiComment): Observable<ApiComment> {
    return this.apiDataService.editComment(this.sanitizeComment(comment)).pipe(
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
    this.commentsStore.set(comments.map(this.sanitizeComment))
    this.commentsStore.setLoading()
  }

  private sanitizeComment(comment: ApiComment): ApiComment {
    const contentSanitized = comment.content
      ?.split('\n')
      .map((line: string) => {
        if (line.startsWith('>')) {
          // Fix for markdown quote parser
          return this.sanitizer
            .sanitize(SecurityContext.HTML, line)
            ?.replace(/&gt;/g, '>')
        } else {
          return this.sanitizer.sanitize(SecurityContext.HTML, line)
        }
      })
      .join('\n')

    return {
      ...comment,
      content: contentSanitized,
    }
  }
}
