import { inject, Injectable } from '@angular/core'
import { ApiDeckArchetype, MetaType } from '@models'
import { BehaviorSubject, Observable, tap } from 'rxjs'
import { ApiDataService } from './api.data.service'

@Injectable({
  providedIn: 'root',
})
export class DeckArchetypeCrudService {
  private readonly api = inject(ApiDataService)

  private readonly _suggestions$ = new BehaviorSubject<ApiDeckArchetype[]>([])
  private readonly _items$ = new BehaviorSubject<ApiDeckArchetype[] | null>(
    null,
  )

  selectAll(): Observable<ApiDeckArchetype[] | null> {
    return this._items$.asObservable()
  }

  selectSuggestions(): Observable<ApiDeckArchetype[]> {
    return this._suggestions$.asObservable()
  }

  loadSuggestions(): Observable<ApiDeckArchetype[]> {
    return this.api
      .getSuggestionDeckArchetypes()
      .pipe(tap((items) => this._suggestions$.next(items)))
  }

  loadAll(metaType: MetaType): Observable<ApiDeckArchetype[]> {
    this._items$.next(null)
    return this.api
      .getAllDeckArchetypes(metaType)
      .pipe(tap((items) => this._items$.next(items)))
  }

  create(archetype: ApiDeckArchetype): Observable<ApiDeckArchetype> {
    return this.api.createDeckArchetype(archetype).pipe(
      tap((created) =>
        this._items$.next([...(this._items$.value ?? []), created]),
      ),
      tap((created) =>
        this._suggestions$.next([
          ...this._suggestions$.value.filter(
            (i) => i.deckId !== created.deckId,
          ),
        ]),
      ),
    )
  }

  update(archetype: ApiDeckArchetype): Observable<ApiDeckArchetype> {
    return this.api.updateDeckArchetype(archetype).pipe(
      tap((updated) =>
        this._items$.next(
          (this._items$.value ?? []).map((i) =>
            i.id === updated.id
              ? {
                  ...updated,
                  // The update endpoint returns all-time metrics, while the
                  // list may be showing a shorter metagame period. Keep the
                  // active list's period-specific values until it is reloaded.
                  metaCount: i.metaCount,
                  metaTotal: i.metaTotal,
                  previousMetaCount: i.previousMetaCount,
                  previousMetaTotal: i.previousMetaTotal,
                  metaShareChange: i.metaShareChange,
                  trend: i.trend,
                }
              : i,
          ),
        ),
      ),
    )
  }

  delete(id: number): Observable<void> {
    return this.api.deleteDeckArchetype(id).pipe(
      tap(() => {
        this._items$.next((this._items$.value ?? []).filter((i) => i.id !== id))
      }),
    )
  }
}
