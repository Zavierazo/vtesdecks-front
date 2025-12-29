import { Injectable, inject } from '@angular/core'
import { ApiDeckArchetype } from '@models'
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

  loadAll(): Observable<ApiDeckArchetype[]> {
    return this.api
      .getAllDeckArchetypes()
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

  delete(id: number): Observable<boolean> {
    return this.api.deleteDeckArchetype(id).pipe(
      tap((ok) => {
        if (ok) {
          this._items$.next(this._items$.value.filter((i) => i.id !== id))
        }
      }),
    )
  }
}
