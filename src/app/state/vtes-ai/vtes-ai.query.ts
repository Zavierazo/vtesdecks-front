import { Injectable } from '@angular/core'
import { Observable, switchMap } from 'rxjs'
import { AiChat, VtesAiStore } from './vtes-ai.store'
@Injectable({
  providedIn: 'root',
})
export class VtesAiQuery {
  constructor(private readonly store: VtesAiStore) {}

  selectLoading(): Observable<boolean> {
    return this.store.selectLoading()
  }

  selectEntities(): Observable<AiChat[]> {
    return this.store.selectEntities()
  }

  selectActiveChat(): Observable<AiChat | undefined> {
    return this.store
      .selectActiveChat()
      .pipe(switchMap((id) => this.store.selectEntity(id)))
  }
}
