import { Injectable, signal } from '@angular/core'
import { toObservable } from '@angular/core/rxjs-interop'
import { ApiFeatureFlag } from '@models'
import { map, Observable } from 'rxjs'

export interface FeatureFlagState {
  flags: Record<string, ApiFeatureFlag>
  loaded: boolean
}

const initialState: FeatureFlagState = {
  flags: {},
  loaded: false,
}

@Injectable({
  providedIn: 'root',
})
export class FeatureFlagStore {
  static readonly storeName = 'featureFlag'
  private readonly state = signal<FeatureFlagState>(initialState)
  private readonly state$ = toObservable(this.state)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  select(selector: (state: FeatureFlagState) => any): Observable<any> {
    return this.state$.pipe(map(selector))
  }

  getValue(): FeatureFlagState {
    return this.state()
  }

  update(value: FeatureFlagState) {
    this.state.update(() => value)
  }

  setFlags(flags: ApiFeatureFlag[]) {
    this.update({
      flags: Object.fromEntries(flags.map((flag) => [flag.key, flag])),
      loaded: true,
    })
  }

  setFlag(flag: ApiFeatureFlag) {
    const current = this.getValue()
    this.update({
      ...current,
      flags: { ...current.flags, [flag.key]: flag },
    })
  }
}
