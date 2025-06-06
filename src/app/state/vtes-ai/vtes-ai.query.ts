import { Injectable, inject } from '@angular/core'
import { Observable, switchMap } from 'rxjs'
import { AiChat, VtesAiStore } from './vtes-ai.store'
@Injectable({
  providedIn: 'root',
})
export class VtesAiQuery {
  private readonly store = inject(VtesAiStore);


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
