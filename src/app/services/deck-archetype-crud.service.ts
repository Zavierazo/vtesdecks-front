import { Injectable, inject } from '@angular/core'
import { ApiDeckArchetype, MetaType } from '@models'
import { BehaviorSubject, Observable, tap } from 'rxjs'
import { ApiDataService } from './api.data.service'

@Injectable({
  providedIn: 'root',
})
export class DeckArchetypeCrudService {
  private readonly api = inject(ApiDataService)

  private readonly _items$ = new BehaviorSubject<ApiDeckArchetype[]>([])

  selectAll(): Observable<ApiDeckArchetype[]> {
    return this._items$.asObservable()
  }

  selectSuggestions(): Observable<ApiDeckArchetype[]> {
    return this.api.getSuggestionDeckArchetypes()
  }

  loadAll(metaType: MetaType): Observable<ApiDeckArchetype[]> {
    return this.api
      .getAllDeckArchetypes(metaType)
      .pipe(tap((items) => this._items$.next(items)))
  }

  create(archetype: ApiDeckArchetype): Observable<ApiDeckArchetype> {
    return this.api
      .createDeckArchetype(archetype)
      .pipe(
        tap((created) => this._items$.next([...this._items$.value, created])),
      )
  }

  update(archetype: ApiDeckArchetype): Observable<ApiDeckArchetype> {
    return this.api
      .updateDeckArchetype(archetype)
      .pipe(
        tap((updated) =>
          this._items$.next(
            this._items$.value.map((i) => (i.id === updated.id ? updated : i)),
          ),
        ),
      )
  }

  delete(id: number): Observable<void> {
    return this.api.deleteDeckArchetype(id).pipe(
      tap(() => {
        this._items$.next(this._items$.value.filter((i) => i.id !== id))
      }),
    )
  }
}
