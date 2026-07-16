import { inject, Injectable } from '@angular/core'
import { ApiFeatureFlag, FeatureFlagValue } from '@models'
import { ApiDataService } from '@services'
import { catchError, Observable, of, tap } from 'rxjs'
import { FeatureFlagStore } from './feature-flag.store'

@Injectable({
  providedIn: 'root',
})
export class FeatureFlagService {
  private readonly store = inject(FeatureFlagStore)
  private readonly apiDataService = inject(ApiDataService)

  load(): void {
    this.apiDataService
      .getFeatureFlags()
      .pipe(catchError(() => of([] as ApiFeatureFlag[])))
      .subscribe((flags) => this.store.setFlags(flags))
  }

  update(key: string, value: FeatureFlagValue): Observable<ApiFeatureFlag> {
    return this.apiDataService
      .updateFeatureFlag(key, value)
      .pipe(tap((flag) => this.store.setFlag(flag)))
  }
}
