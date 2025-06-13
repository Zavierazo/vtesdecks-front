import { Injectable, signal } from '@angular/core'
import { toObservable } from '@angular/core/rxjs-interop'
import { Observable } from 'rxjs'
import { ApiComment } from './../../models/api-comment'

@Injectable({
  providedIn: 'root',
})
export class CommentsStore {
  private readonly state = signal<ApiComment[]>([])
  private readonly state$ = toObservable(this.state)
  private readonly loading = signal<boolean>(false)
  private readonly loading$ = toObservable(this.loading)

  selectLoading(): Observable<boolean> {
    return this.loading$
  }

  selectState(): Observable<ApiComment[]> {
    return this.state$
  }

  getValue(): ApiComment[] {
    return this.state()
  }

  getLoading(): boolean {
    return this.loading()
  }

  reset(): void {
    this.state.update(() => [])
    this.loading.update(() => false)
  }

  set(value: ApiComment[]) {
    this.state.update(() => value)
  }

  update(id: number, comment: ApiComment) {
    this.state.update((comments) =>
      comments.map((c) => (c.id === id ? comment : c)),
    )
  }

  add(comment: ApiComment) {
    this.state.update((comments) => [...comments, comment])
  }

  remove(id: number) {
    this.state.update((comments) =>
      comments.filter((comment) => comment.id !== id),
    )
  }

  setLoading(value = false) {
    this.loading.update(() => value)
  }
}
