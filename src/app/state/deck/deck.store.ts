import { Injectable, signal } from '@angular/core'
import { toObservable } from '@angular/core/rxjs-interop'
import { map, Observable } from 'rxjs'
import { ApiDeck } from '../../models/api-deck'

export interface DeckState {
  deck?: ApiDeck
}

const initialState: DeckState = {}

@Injectable({
  providedIn: 'root',
})
export class DeckStore {
  private readonly state = signal<DeckState>(initialState)
  private readonly state$ = toObservable(this.state)
  private readonly loading = signal<boolean>(false)
  private readonly loading$ = toObservable(this.loading)

  selectLoading(): Observable<boolean> {
    return this.loading$
  }

  selectState(): Observable<DeckState> {
    return this.state$
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  select(selector: (state: DeckState) => any): Observable<any> {
    return this.state$.pipe(map(selector))
  }

  getValue(): DeckState {
    return this.state()
  }

  getLoading(): boolean {
    return this.loading()
  }

  reset(): void {
    this.state.update(() => initialState)
    this.loading.update(() => false)
  }

  setLoading(value = false) {
    this.loading.update(() => value)
  }

  update(updateFn: (value: DeckState) => DeckState) {
    this.state.update(updateFn)
  }
}
