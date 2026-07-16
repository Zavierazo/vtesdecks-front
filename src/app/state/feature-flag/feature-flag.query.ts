import { inject, Injectable } from '@angular/core'
import { ApiFeatureFlag } from '@models'
import { distinctUntilChanged, Observable } from 'rxjs'
import { FeatureFlagState, FeatureFlagStore } from './feature-flag.store'

@Injectable({
  providedIn: 'root',
})
export class FeatureFlagQuery {
  private readonly store = inject(FeatureFlagStore)

  selectAll(): Observable<ApiFeatureFlag[]> {
    return this.store.select((state: FeatureFlagState) =>
      Object.values(state.flags),
    )
  }

  selectEnabled(key: string): Observable<boolean> {
    return this.store
      .select((state: FeatureFlagState) => isEnabled(state.flags[key]))
      .pipe(distinctUntilChanged())
  }

  selectString(key: string): Observable<string | undefined> {
    return this.store
      .select((state: FeatureFlagState) => getString(state.flags[key]))
      .pipe(distinctUntilChanged())
  }

  selectList(key: string): Observable<string[]> {
    return this.store.select((state: FeatureFlagState) =>
      getList(state.flags[key]),
    )
  }

  isEnabled(key: string): boolean {
    return isEnabled(this.store.getValue().flags[key])
  }

  getString(key: string): string | undefined {
    return getString(this.store.getValue().flags[key])
  }

  getList(key: string): string[] {
    return getList(this.store.getValue().flags[key])
  }
}

function isEnabled(flag?: ApiFeatureFlag): boolean {
  return flag?.type === 'BOOLEAN' && flag.value === true
}

function getString(flag?: ApiFeatureFlag): string | undefined {
  return flag?.type === 'STRING' && typeof flag.value === 'string'
    ? flag.value
    : undefined
}

function getList(flag?: ApiFeatureFlag): string[] {
  return flag?.type === 'LIST' && Array.isArray(flag.value) ? flag.value : []
}
